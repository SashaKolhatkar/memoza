"""Duration prediction and historical analytics.

Important: when there is not enough personal history, the API returns a
transparent rule-based estimate and labels it `rule_based`. Only a locally
trained model can produce `model_prediction`. Nothing here makes claims about
mental health or personality.
"""

import json
import logging
import math
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.config import settings

logger = logging.getLogger(__name__)
MIN_TRAINING_SAMPLES = 20
CATEGORICAL_FEATURES = ["category", "importance", "difficulty", "energy", "rough_mode", "length", "part_of_day"]
FEATURES = CATEGORICAL_FEATURES

CATEGORY_BASELINES = {
    "general": 25.0,
    "work": 35.0,
    "study": 40.0,
    "creative": 45.0,
    "technical": 50.0,
    "admin": 15.0,
    "personal": 20.0,
    "health": 20.0,
}

DIFFICULTY_MULTIPLIER = {
    "unknown": 1.25,
    "overwhelming": 1.35,
    "quality": 1.3,
    "unmotivated": 1.15,
    "distracted": 1.2,
}


def _part_of_day(hour: int | None) -> str:
    if hour is None:
        return "unknown"
    if hour < 12:
        return "morning"
    if hour < 17:
        return "afternoon"
    return "evening"


def _length_bucket(title: str) -> str:
    count = len(title.strip())
    if count < 18:
        return "short"
    if count < 45:
        return "medium"
    return "long"


def extract_features(payload: dict) -> dict:
    title = payload.get("title") or ""
    hour = payload.get("hour")
    return {
        "category": (payload.get("category") or "general").lower()[:40],
        "importance": str(max(1, min(5, int(payload.get("importance") or 3)))),
        "difficulty": (payload.get("difficulty_reason") or "none").lower()[:40],
        "energy": (payload.get("energy") or "medium").lower()[:20],
        "rough_mode": (payload.get("rough_mode") or "off").lower()[:24],
        "length": _length_bucket(title),
        "part_of_day": _part_of_day(hour),
    }


def rule_based_minutes(payload: dict) -> tuple[float, str]:
    features = extract_features(payload)
    base = CATEGORY_BASELINES.get(features["category"], 25.0)
    base *= 1 + (int(features["importance"]) - 3) * 0.12
    base *= DIFFICULTY_MULTIPLIER.get(features["difficulty"], 1.0)
    if features["rough_mode"] == "rough":
        base *= 0.75
    elif features["rough_mode"] == "polish_later":
        base *= 0.85
    if features["length"] == "long":
        base *= 1.15
    minutes = round(max(5, min(240, base)) / 5) * 5
    explanation = (
        f"Based on the task category ({features['category']}), importance, the starting difficulty you selected, "
        "and similar task types in general. This is a rule of thumb, not a prediction from your own data."
    )
    return float(minutes), explanation


def _model_paths(user_id: str | None) -> tuple[Path, Path]:
    """Every account gets its own model file. Nothing is shared between users."""
    base = Path(settings.model_path)
    safe = "".join(character for character in (user_id or "shared") if character.isalnum() or character in "-_")[:64]
    model = base.with_name(f"{base.stem}_{safe or 'shared'}{base.suffix or '.joblib'}")
    return model, model.with_suffix(".json")


def delete_user_models(user_id: str) -> None:
    """Remove per-account model files when an account is deleted."""
    for path in _model_paths(user_id):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove model file %s", path)


def build_training_frame(tasks: list, sessions: list) -> pd.DataFrame:
    rows: list[dict] = []
    # A finished focus session copies its duration onto the task. Count that
    # observation once: prefer the session row and skip the mirrored task row.
    task_ids_with_session = {
        getattr(session, "task_id", None)
        for session in sessions
        if getattr(session, "mode", None) == "task"
        and getattr(session, "actual_minutes", 0)
        and session.actual_minutes > 0
    }
    for task in tasks:
        if task.actual_minutes and task.actual_minutes > 0 and task.id not in task_ids_with_session:
            hour = task.created_at.hour if task.created_at else None
            rows.append({
                **extract_features({
                    "title": task.title,
                    "category": task.category,
                    "importance": task.importance,
                    "difficulty_reason": task.difficulty_reason,
                    "energy": task.energy,
                    "rough_mode": task.rough_mode,
                    "hour": hour,
                }),
                "minutes": float(task.actual_minutes),
            })
    for session in sessions:
        if session.mode != "task" or not session.actual_minutes or session.actual_minutes <= 0:
            continue
        task = getattr(session, "task", None)
        hour = session.started_at.hour if session.started_at else None
        rows.append({
            **extract_features({
                "title": getattr(task, "title", "focus session"),
                "category": getattr(task, "category", "general"),
                "importance": getattr(task, "importance", 3),
                "difficulty_reason": getattr(task, "difficulty_reason", None),
                "energy": getattr(task, "energy", "medium"),
                "rough_mode": getattr(task, "rough_mode", "off"),
                "hour": hour,
            }),
            "minutes": float(session.actual_minutes),
        })
    return pd.DataFrame(rows, columns=FEATURES + ["minutes"])


def _pipeline() -> Pipeline:
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    preprocess = ColumnTransformer([("cat", encoder, CATEGORICAL_FEATURES)])
    return Pipeline([
        ("prep", preprocess),
        ("model", RandomForestRegressor(n_estimators=120, min_samples_leaf=2, random_state=42, n_jobs=1)),
    ])


def train_model(tasks: list, sessions: list, user_id: str | None = None) -> dict:
    frame = build_training_frame(tasks, sessions)
    samples = len(frame)
    if samples < MIN_TRAINING_SAMPLES:
        return {
            "trained": False,
            "samples": samples,
            "required_samples": MIN_TRAINING_SAMPLES,
            "reason": "Not enough of your own completed-task durations yet.",
        }
    x, y = frame[FEATURES], frame["minutes"]
    try:
        x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.25, random_state=42)
        model = _pipeline()
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        mae = float(np.mean(np.abs(predictions - y_test.values)))
        model.fit(x, y)
        import joblib

        path, meta_path = _model_paths(user_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, path)
        meta = {"samples": samples, "mae": round(mae, 1), "features": FEATURES}
        meta_path.write_text(json.dumps(meta), encoding="utf-8")
        for model_file in (path, meta_path):
            try:
                os.chmod(model_file, 0o600)
            except OSError:
                logger.warning("Could not restrict permissions on %s", model_file)
        return {
            "trained": True,
            "samples": samples,
            "mae_minutes": round(mae, 1),
        }
    except Exception:  # pragma: no cover - defensive; ML must never break the app
        logger.exception("Duration model training was skipped")
        return {
            "trained": False,
            "samples": samples,
            "reason": "Training was skipped: data or storage unavailable.",
        }


def model_status(tasks: list, sessions: list, user_id: str | None = None) -> dict:
    frame = build_training_frame(tasks, sessions)
    samples = len(frame)
    path, meta_path = _model_paths(user_id)
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            meta = {}
    return {
        "available": path.exists() and samples >= MIN_TRAINING_SAMPLES,
        "training_samples": samples,
        "required_samples": MIN_TRAINING_SAMPLES,
        "last_trained_samples": meta.get("samples", 0),
        "mean_absolute_error_minutes": meta.get("mae"),
        "source": "model_prediction" if path.exists() and samples >= MIN_TRAINING_SAMPLES else "rule_based",
        "message": (
            "Personal duration model is active."
            if path.exists() and samples >= MIN_TRAINING_SAMPLES
            else f"Collecting your own duration history ({samples}/{MIN_TRAINING_SAMPLES} records). "
                 "Estimates are transparent rules until then."
        ),
    }


def predict_duration(payload: dict, tasks: list, sessions: list, user_id: str | None = None) -> dict:
    status = model_status(tasks, sessions, user_id)
    if status["available"]:
        try:
            import joblib

            path, _ = _model_paths(user_id)
            model = joblib.load(path)
            features = pd.DataFrame([extract_features(payload)], columns=FEATURES)
            value = float(model.predict(features)[0])
            minutes = float(round(max(5, min(480, value)) / 5) * 5)
            confidence = "moderate" if status["training_samples"] >= 50 else "low"
            return {
                "minutes": minutes,
                "source": "model_prediction",
                "confidence": confidence,
                "basis": (
                    f"Trained locally on {status['training_samples']} of your recorded task durations. "
                    f"Typical error: about {status.get('mean_absolute_error_minutes', '?')} minutes."
                ),
                "training_samples": status["training_samples"],
            }
        except Exception:  # pragma: no cover
            pass
    minutes, explanation = rule_based_minutes(payload)
    return {
        "minutes": minutes,
        "source": "rule_based",
        "confidence": "low",
        "basis": explanation,
        "training_samples": status["training_samples"],
    }


def analytics(tasks: list, sessions: list, routines: list, logs: list) -> dict:
    completed = [task for task in tasks if task.status == "done" and task.completed_at]
    session_list = [s for s in sessions if s.mode == "task"]

    accuracy_rows = [
        (task.actual_minutes / task.estimated_minutes)
        for task in completed
        if task.actual_minutes and task.estimated_minutes
    ]
    accuracy = round(float(np.mean(np.clip(accuracy_rows, 0, 3))), 2) if accuracy_rows else None

    duration_history = [
        {
            "date": (s.ended_at or s.started_at).date().isoformat(),
            "planned": round(s.planned_minutes, 1),
            "actual": round(s.actual_minutes, 1),
            "label": "Focus session",
        }
        for s in sorted(session_list, key=lambda item: item.started_at)[-40:]
        if s.actual_minutes > 0
    ]

    category_counts: dict[str, int] = {}
    for task in completed:
        category_counts[task.category or "general"] = category_counts.get(task.category or "general", 0) + 1
    category_breakdown = [
        {"category": key, "count": value}
        for key, value in sorted(category_counts.items(), key=lambda item: -item[1])
    ]

    routine_consistency = []
    for routine in routines:
        routine_logs = [log for log in logs if log.routine_id == routine.id and log.completed]
        routine_consistency.append({
            "name": routine.name,
            "completed": len(routine_logs),
            "versions": {
                version: len([log for log in routine_logs if log.version == version])
                for version in ("full", "short", "minimum")
            },
        })

    total_minutes = sum(s.actual_minutes for s in session_list)
    recommendations: list[dict] = []
    if accuracy and accuracy > 1.3:
        recommendations.append({
            "type": "duration",
            "title": "Your tasks often take longer than planned",
            "body": "Try adding a little more time to similar tasks, or choose a shorter first action. "
                    "This comes from your recorded durations.",
            "source": "historical_rule",
        })
    elif accuracy and accuracy < 0.7:
        recommendations.append({
            "type": "duration",
            "title": "Your estimates have room to grow",
            "body": "You are finishing faster than planned. You can safely plan a little more in a block.",
            "source": "historical_rule",
        })
    if total_minutes >= 120:
        recommendations.append({
            "type": "breaks",
            "title": "Protect your breaks",
            "body": "You have recorded several focus sessions. Keeping short breaks between them helps the day stay steady.",
            "source": "historical_rule",
        })
    if not recommendations:
        recommendations.append({
            "type": "getting_started",
            "title": "Record what actually happened",
            "body": "After a focus session, note how long it took. That is what makes future plans more realistic.",
            "source": "historical_rule",
        })

    return {
        "total_sessions": len(session_list),
        "total_tasks_completed": len(completed),
        "average_estimate_accuracy": accuracy,
        "total_focus_minutes": round(float(total_minutes), 1),
        "duration_history": duration_history,
        "category_breakdown": category_breakdown,
        "routine_consistency": routine_consistency,
        "recommendations": recommendations,
    }
