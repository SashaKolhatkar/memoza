from datetime import datetime, timedelta, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import apply_update, get_task, log_event
from app.auth import get_current_user
from app.db import get_db
from app.models import Task, TaskEvent, utcnow
from app.schemas import (
    MissedTaskActionIn,
    StartAssistIn,
    StartAssistOut,
    TaskCreate,
    TaskEventOut,
    TaskOut,
    TaskReorderIn,
    TaskUpdate,
)
from app.services.start_assist import assist

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(Task).where(Task.user_id == user.id)
    if status_filter:
        if "," in status_filter:
            query = query.where(Task.status.in_([part.strip() for part in status_filter.split(",")]))
        else:
            query = query.where(Task.status == status_filter)
    if category:
        query = query.where(Task.category == category)
    query = query.order_by(Task.position, Task.created_at.desc()).limit(limit)
    return list(db.scalars(query).all())


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = payload.model_dump()
    if not data.get("first_action"):
        from app.services.start_assist import suggest_first_action
        data["first_action"] = suggest_first_action(data["title"], data.get("difficulty_reason"))
    task = Task(**data, user_id=user.id)
    db.add(task)
    db.flush()
    log_event(db, user.id, task.id, "created", {"status": task.status})
    db.commit()
    db.refresh(task)
    return task


@router.get("/assist", response_model=StartAssistOut)
def start_assist(title: str, difficulty_reason: str | None = None, category: str = "general"):
    return assist(title, difficulty_reason, category)


@router.post("/reorder", response_model=list[TaskOut])
def reorder(payload: TaskReorderIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    for index, task_id in enumerate(payload.ids):
        task = get_task(db, task_id, user.id)
        task.position = index
    db.commit()
    return list(db.scalars(select(Task).where(Task.user_id == user.id).order_by(Task.position, Task.created_at.desc())).all())


@router.get("/{task_id}", response_model=TaskOut)
def read_task(task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_task(db, task_id, user.id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    task = get_task(db, task_id, user.id)
    changed = apply_update(task, payload)
    if "status" in changed and task.status == "done":
        task.completed_at = task.completed_at or utcnow()
    if "status" in changed and task.status != "done":
        task.completed_at = None
    log_event(db, user.id, task.id, "updated", {"fields": changed})
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    task = get_task(db, task_id, user.id)
    db.delete(task)
    db.commit()
    return None


@router.post("/{task_id}/start", response_model=TaskOut)
def start_task(task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    task = get_task(db, task_id, user.id)
    task.started_at = task.started_at or utcnow()
    if task.status != "done":
        task.status = "today"
    log_event(db, user.id, task.id, "started", {})
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskOut)
def complete_task(
    task_id: str,
    actual_minutes: float | None = Query(default=None, ge=0, le=1440),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    task = get_task(db, task_id, user.id)
    task.status = "done"
    task.completed_at = utcnow()
    if actual_minutes is not None:
        task.actual_minutes = actual_minutes
    log_event(db, user.id, task.id, "completed", {"actual_minutes": actual_minutes})
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/events", response_model=list[TaskEventOut])
def task_events(task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    get_task(db, task_id, user.id)
    return list(db.scalars(
        select(TaskEvent)
        .where(TaskEvent.task_id == task_id, TaskEvent.user_id == user.id)
        .order_by(TaskEvent.created_at.desc())
    ).all())


@router.post("/{task_id}/missed", response_model=dict)
def handle_missed(task_id: str, payload: MissedTaskActionIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Handle one missed task. Nothing else is touched."""
    task = get_task(db, task_id, user.id)
    action = payload.action
    message = ""

    if action == "reschedule":
        task.scheduled_start = None
        task.scheduled_end = None
        task.status = "today"
        message = "Kept for today, with no fixed time. You can place it when you are ready."
    elif action == "break_down":
        task.status = "upcoming"
        parts = []
        milestones = [m for m in (task.milestones or []) if isinstance(m, dict) and m.get("title")]
        if milestones:
            parts = [m["title"] for m in milestones[:3]]
        else:
            parts = [task.first_action or f"Open what you need for {task.title}", f"Continue working on {task.title}"]
        for index, part in enumerate(parts):
            db.add(Task(
                user_id=user.id,
                title=part,
                status="today",
                category=task.category,
                priority=task.priority,
                importance=max(1, task.importance - 1),
                energy=task.energy,
                estimated_minutes=max(10, round((task.estimated_minutes or 25) / len(parts))),
                first_action=part,
                source="break_down",
                tags=[task.id],
                position=index,
            ))
        message = f"Created {len(parts)} smaller actions. The original is still here, unchanged in content."
    elif action == "reduce_scope":
        original = task.estimated_minutes or 25
        task.estimated_minutes = max(10, round(original * 0.5))
        task.notes = f"{task.notes}\n\nReduced scope: first useful piece only (was {int(original)} min).".strip()
        task.status = "today"
        message = "Scope reduced to a smaller first piece. Nothing else was moved."
    elif action == "move_to_another_day":
        target = datetime.fromisoformat(payload.target_date).date() if payload.target_date else (utcnow().date() + timedelta(days=1))
        start = datetime.combine(target, time(hour=10))
        task.scheduled_start = start
        task.scheduled_end = start + timedelta(minutes=task.estimated_minutes or 25)
        task.status = "upcoming"
        message = f"Moved only this task to {target.isoformat()}."
    elif action == "remove":
        task.status = "archived"
        message = "Removed from your active list. Nothing was deleted."

    log_event(db, user.id, task.id, f"missed_{action}", {"message": message})
    db.commit()
    db.refresh(task)
    return {"message": message, "task": TaskOut.model_validate(task).model_dump(mode="json")}
