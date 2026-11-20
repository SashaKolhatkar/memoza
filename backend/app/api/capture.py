from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import parse_datetime_param
from app.auth import get_current_user
from app.db import get_db
from app.models import BrainDump, CalendarEvent, Routine, RoutineLog, Task, new_id, utcnow
from app.schemas import (
    BrainDumpCreate,
    BrainDumpOut,
    BrainDumpUpdate,
    EventCreate,
    EventOut,
    EventUpdate,
    RoutineCreate,
    RoutineLogIn,
    RoutineLogOut,
    RoutineOut,
    RoutineUpdate,
    TaskOut,
)
from app.services.start_assist import suggest_first_action

router = APIRouter(tags=["capture"])


# ---------------------------------------------------------------- brain dump
@router.get("/api/braindumps", response_model=list[BrainDumpOut])
def list_braindumps(
    category: str | None = None,
    parking_lot: bool | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(BrainDump).where(BrainDump.user_id == user.id)
    if category:
        query = query.where(BrainDump.category == category)
    if parking_lot is not None:
        query = query.where(BrainDump.parking_lot == parking_lot)
    return list(db.scalars(query.order_by(BrainDump.created_at.desc()).limit(limit)).all())


@router.post("/api/braindumps", response_model=BrainDumpOut, status_code=status.HTTP_201_CREATED)
def create_braindump(payload: BrainDumpCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = BrainDump(**payload.model_dump(), user_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/api/braindumps/{item_id}", response_model=BrainDumpOut)
def update_braindump(item_id: str, payload: BrainDumpUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.get(BrainDump, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Thought not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/braindumps/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_braindump(item_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.get(BrainDump, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Thought not found.")
    db.delete(item)
    db.commit()
    return None


@router.post("/api/braindumps/{item_id}/convert", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def convert_braindump(item_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.get(BrainDump, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Thought not found.")
    if item.converted_task_id:
        existing = db.get(Task, item.converted_task_id)
        if existing and existing.user_id == user.id:
            return existing
    category_map = {"today": "today", "upcoming": "upcoming", "someday": "someday", "reminders": "upcoming", "ideas": "someday"}
    status_value = category_map.get(item.category, "someday")
    task = Task(
        user_id=user.id,
        title=item.text[:400],
        status=status_value,
        category="general",
        first_action=suggest_first_action(item.text),
        source="brain_dump",
        estimated_minutes=25,
    )
    db.add(task)
    db.flush()
    item.converted_task_id = task.id
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------- routines
@router.get("/api/routines", response_model=list[RoutineOut])
def list_routines(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return list(db.scalars(select(Routine).where(Routine.user_id == user.id).order_by(Routine.created_at)).all())


@router.post("/api/routines", response_model=RoutineOut, status_code=status.HTTP_201_CREATED)
def create_routine(payload: RoutineCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    routine = Routine(**payload.model_dump(), user_id=user.id)
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine


@router.patch("/api/routines/{routine_id}", response_model=RoutineOut)
def update_routine(routine_id: str, payload: RoutineUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    routine = db.get(Routine, routine_id)
    if not routine or routine.user_id != user.id:
        raise HTTPException(404, "Routine not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(routine, key, value)
    db.commit()
    db.refresh(routine)
    return routine


@router.delete("/api/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(routine_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    routine = db.get(Routine, routine_id)
    if not routine or routine.user_id != user.id:
        raise HTTPException(404, "Routine not found.")
    db.delete(routine)
    db.commit()
    return None


@router.post("/api/routines/{routine_id}/log", response_model=RoutineLogOut)
def log_routine(routine_id: str, payload: RoutineLogIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    routine = db.get(Routine, routine_id)
    if not routine or routine.user_id != user.id:
        raise HTTPException(404, "Routine not found.")
    existing = db.scalar(
        select(RoutineLog).where(
            RoutineLog.user_id == user.id,
            RoutineLog.routine_id == routine_id,
            RoutineLog.day == payload.day,
            RoutineLog.version == payload.version,
        )
    )
    if existing:
        existing.completed = payload.completed
        existing.note = payload.note
        log = existing
    else:
        log = RoutineLog(**payload.model_dump(), user_id=user.id, routine_id=routine_id)
        db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/api/routines/logs", response_model=list[RoutineLogOut])
def routine_logs(
    since: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(RoutineLog).where(RoutineLog.user_id == user.id)
    if since:
        query = query.where(RoutineLog.day >= since)
    return list(db.scalars(query.order_by(RoutineLog.day.desc())).all())


# ---------------------------------------------------------------- events
@router.get("/api/events", response_model=list[EventOut])
def list_events(
    start: str | None = None,
    end: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(CalendarEvent).where(CalendarEvent.user_id == user.id)
    if start:
        query = query.where(CalendarEvent.start_at >= parse_datetime_param(start))
    if end:
        query = query.where(CalendarEvent.start_at <= parse_datetime_param(end))
    return list(db.scalars(query.order_by(CalendarEvent.start_at)).all())


@router.post("/api/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    event = CalendarEvent(**payload.model_dump(), user_id=user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/api/events/{event_id}", response_model=EventOut)
def update_event(event_id: str, payload: EventUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    event = db.get(CalendarEvent, event_id)
    if not event or event.user_id != user.id:
        raise HTTPException(404, "Event not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/api/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    event = db.get(CalendarEvent, event_id)
    if not event or event.user_id != user.id:
        raise HTTPException(404, "Event not found.")
    db.delete(event)
    db.commit()
    return None


@router.get("/api/events/upcoming", response_model=list[dict])
def upcoming(
    limit: int = Query(default=6, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    now = utcnow()
    events = db.scalars(
        select(CalendarEvent).where(CalendarEvent.user_id == user.id, CalendarEvent.start_at >= now - timedelta(days=1))
        .order_by(CalendarEvent.start_at).limit(limit)
    ).all()
    deadlines = db.scalars(
        select(Task).where(Task.user_id == user.id, Task.status != "done", Task.due_at >= now - timedelta(days=1))
        .order_by(Task.due_at).limit(limit)
    ).all()
    result = [
        {
            "id": event.id,
            "kind": "event",
            "title": event.title,
            "at": event.start_at.isoformat() + "Z",
            "meta": event.event_type,
            "prep_minutes": event.prep_minutes + event.travel_minutes,
        }
        for event in events
    ]
    result += [
        {
            "id": task.id,
            "kind": "deadline",
            "title": task.title,
            "at": task.due_at.isoformat() + "Z",
            "meta": "task deadline",
            "prep_minutes": 0,
        }
        for task in deadlines if task.due_at
    ]
    result.sort(key=lambda item: item["at"])
    return result[:limit]
