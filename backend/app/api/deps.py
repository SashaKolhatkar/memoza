import re
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Task, TaskEvent, utcnow


def get_task(db: Session, task_id: str, user_id: str) -> Task:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


def log_event(db: Session, user_id: str, task_id: str, event_type: str, payload: dict | None = None) -> None:
    db.add(TaskEvent(
        user_id=user_id,
        task_id=task_id,
        event_type=event_type,
        payload=payload or {},
        created_at=utcnow(),
    ))


def apply_update(task: Task, update) -> list[str]:
    """Apply only fields that were explicitly provided."""
    changed: list[str] = []
    data = update.model_dump(exclude_unset=True, exclude_none=False)
    # exclude_none=False keeps intentional nulls (e.g. clearing a due date)
    for key, value in data.items():
        if hasattr(task, key) and getattr(task, key) != value:
            setattr(task, key, value)
            changed.append(key)
    return changed


_DAY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_day_param(day: str) -> date:
    if not _DAY_PATTERN.fullmatch(day):
        raise HTTPException(status_code=422, detail="Use YYYY-MM-DD for the day.")
    try:
        return date.fromisoformat(day)
    except ValueError:
        raise HTTPException(status_code=422, detail="Use a real calendar date.") from None


def parse_datetime_param(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=422, detail="Use an ISO date or date-time.") from None
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def day_bounds(day: str) -> tuple[datetime, datetime]:
    start = datetime.combine(parse_day_param(day), time.min)
    return start, start + timedelta(days=1)
