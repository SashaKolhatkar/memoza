from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import FocusSession, Routine, RoutineLog, Task
from app.rate_limit import check_rate_limit
from app.schemas import InsightsOut, PredictDurationIn, PredictionOut
from app.services import ml

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _data(db: Session, user_id: str):
    tasks = list(db.scalars(select(Task).where(Task.user_id == user_id)).all())
    sessions = list(db.scalars(select(FocusSession).where(FocusSession.user_id == user_id)).all())
    routines = list(db.scalars(select(Routine).where(Routine.user_id == user_id)).all())
    logs = list(db.scalars(select(RoutineLog).where(RoutineLog.user_id == user_id)).all())
    return tasks, sessions, routines, logs


@router.get("", response_model=InsightsOut)
def insights(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tasks, sessions, routines, logs = _data(db, user.id)
    result = ml.analytics(tasks, sessions, routines, logs)
    return InsightsOut(model_status=ml.model_status(tasks, sessions, user.id), **result)


@router.post("/predict-duration", response_model=PredictionOut)
def predict(payload: PredictDurationIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tasks, sessions, _, _ = _data(db, user.id)
    return PredictionOut(**ml.predict_duration(payload.model_dump(), tasks, sessions, user.id))


@router.post("/train", response_model=dict)
def train(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Train a local duration model only if enough personal history exists."""
    check_rate_limit(request, f"train:{user.id}", limit=6, window_seconds=3600)
    tasks, sessions, _, _ = _data(db, user.id)
    return ml.train_model(tasks, sessions, user.id)
