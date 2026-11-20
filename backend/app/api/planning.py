from datetime import datetime, timedelta, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import parse_day_param
from app.auth import get_current_user
from app.db import get_db
from app.models import CalendarEvent, ScheduleBlock, Task, new_id, utcnow
from app.schemas import (
    ApplyScheduleIn,
    RestartPriorityOut,
    RestartRebuildIn,
    ScheduleBlockOut,
    ScheduleProposal,
    ScheduleRequest,
)
from app.services import scheduler
from app.services.start_assist import assist

router = APIRouter(tags=["planning"])


def _open_tasks(db: Session, user_id: str) -> list[Task]:
    return list(db.scalars(
        select(Task).where(Task.user_id == user_id, Task.status.in_(["today", "upcoming"]))
        .order_by(Task.position, Task.created_at.desc())
    ).all())


def _events(db: Session, user_id: str, day: str) -> list[CalendarEvent]:
    start = datetime.combine(scheduler.parse_day(day), time.min)
    return list(db.scalars(
        select(CalendarEvent).where(
            CalendarEvent.user_id == user_id,
            CalendarEvent.start_at >= start - timedelta(days=1),
            CalendarEvent.start_at <= start + timedelta(days=2),
        )
    ).all())


@router.post("/api/schedule/preview", response_model=ScheduleProposal)
def preview_schedule(payload: ScheduleRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    proposal = scheduler.propose_schedule(payload, _open_tasks(db, user.id), _events(db, user.id, payload.day))
    return ScheduleProposal(**proposal)


@router.post("/api/schedule/apply", response_model=list[ScheduleBlockOut])
def apply_schedule(payload: ApplyScheduleIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Apply a preview the user has reviewed. Existing blocks for this day are replaced by the new generation."""
    start = datetime.combine(scheduler.parse_day(payload.day), time.min)
    end = start + timedelta(days=1)
    old_blocks = db.scalars(
        select(ScheduleBlock).where(
            ScheduleBlock.user_id == user.id,
            ScheduleBlock.start_at >= start,
            ScheduleBlock.start_at < end,
        )
    ).all()
    for block in old_blocks:
        db.delete(block)

    created: list[ScheduleBlock] = []
    for item in payload.blocks:
        if item.task_id and item.kind == "task":
            task = db.get(Task, item.task_id)
            if not task or task.user_id != user.id:
                raise HTTPException(status_code=404, detail="Task not found.")
        else:
            task = None
        block = ScheduleBlock(
            user_id=user.id,
            task_id=item.task_id,
            kind=item.kind,
            label=item.label,
            start_at=item.start_at,
            end_at=item.end_at,
            generation_id=payload.generation_id,
        )
        db.add(block)
        created.append(block)
        if payload.apply_task_times and task:
            task.scheduled_start = item.start_at
            task.scheduled_end = item.end_at

    db.commit()
    for block in created:
        db.refresh(block)
    return created


@router.get("/api/schedule/blocks", response_model=list[ScheduleBlockOut])
def list_blocks(day: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    start = datetime.combine(parse_day_param(day), time.min)
    end = start + timedelta(days=1)
    return list(db.scalars(
        select(ScheduleBlock).where(
            ScheduleBlock.user_id == user.id,
            ScheduleBlock.start_at >= start,
            ScheduleBlock.start_at < end,
        ).order_by(ScheduleBlock.start_at)
    ).all())


@router.delete("/api/schedule/blocks", response_model=dict)
def clear_blocks(day: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    start = datetime.combine(parse_day_param(day), time.min)
    end = start + timedelta(days=1)
    blocks = db.scalars(
        select(ScheduleBlock).where(
            ScheduleBlock.user_id == user.id,
            ScheduleBlock.start_at >= start,
            ScheduleBlock.start_at < end,
        )
    ).all()
    count = len(blocks)
    for block in blocks:
        db.delete(block)
    db.commit()
    return {"message": f"Cleared {count} time block(s) for this day. Your tasks were not changed."}


# ------------------------------------------------------------------ restart
@router.post("/api/restart/rebuild", response_model=ScheduleProposal)
def restart_rebuild(payload: RestartRebuildIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Suggest a realistic plan for the remaining hours. Never applies it automatically."""
    tasks = _open_tasks(db, user.id)
    if payload.task_ids is not None:
        tasks = [task for task in tasks if task.id in payload.task_ids]
    now = utcnow()
    request = ScheduleRequest(
        day=payload.day,
        energy=payload.energy,
        available_start=payload.available_start,
        available_end=payload.available_end,
    )
    proposal = scheduler.propose_schedule(request, tasks, _events(db, user.id, payload.day), now=now)
    proposal["notes"].insert(0, "Only the tasks you choose will be placed. Everything else stays as it is.")
    return ScheduleProposal(**proposal)


@router.get("/api/restart/choose-priority", response_model=list[RestartPriorityOut])
def restart_priority(limit: int = Query(default=3, ge=1, le=10), db: Session = Depends(get_db), user=Depends(get_current_user)):
    ranked = scheduler.rank_priorities(_open_tasks(db, user.id), limit=limit)
    return [RestartPriorityOut(**item) for item in ranked]


@router.get("/api/restart/get-started")
def restart_get_started(task_id: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tasks = _open_tasks(db, user.id)
    ranked = scheduler.rank_priorities(tasks, limit=1)
    task = next((item for item in tasks if item.id == task_id), None) if task_id else None
    if task is None and ranked:
        task = db.get(Task, ranked[0]["task_id"])
    if task is None:
        return {
            "task": None,
            "assist": assist("Add one small thing you would like to do today", "unknown"),
            "message": "There is no open task yet. Here is a gentle place to begin.",
        }
    result = assist(task.title, task.difficulty_reason, task.category)
    return {
        "task": {"id": task.id, "title": task.title, "first_action": task.first_action or result["first_action"]},
        "assist": result,
        "message": "One tiny action is enough for now.",
    }
