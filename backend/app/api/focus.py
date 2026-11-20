from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_task, log_event
from app.auth import get_current_user
from app.db import get_db
from app.models import BrainDump, FocusSession, Task, utcnow
from app.schemas import DistractionIn, SessionCreate, SessionOut, SessionUpdate

router = APIRouter(prefix="/api/sessions", tags=["focus"])


@router.get("", response_model=list[SessionOut])
def list_sessions(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return list(db.scalars(
        select(FocusSession).where(FocusSession.user_id == user.id)
        .order_by(FocusSession.started_at.desc()).limit(limit)
    ).all())


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def start_session(payload: SessionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if payload.task_id:
        task = get_task(db, payload.task_id, user.id)
        task.started_at = task.started_at or utcnow()
        log_event(db, user.id, task.id, "focus_started", {"planned_minutes": payload.planned_minutes})
    session = FocusSession(**payload.model_dump(), user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found.")
    return session


@router.patch("/{session_id}", response_model=SessionOut)
def finish_session(
    session_id: str,
    payload: SessionUpdate,
    record_duration: bool = Query(default=True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found.")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(session, key, value)
    if data.get("completed") and not session.ended_at:
        session.ended_at = utcnow()

    if record_duration and session.mode == "task" and session.actual_minutes and session.actual_minutes > 0:
        task = db.get(Task, session.task_id) if session.task_id else None
        if task and task.user_id == user.id:
            task.actual_minutes = session.actual_minutes
            log_event(db, user.id, task.id, "duration_recorded", {"minutes": session.actual_minutes})

    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/distractions", response_model=SessionOut)
def add_distraction(
    session_id: str,
    payload: DistractionIn,
    park: bool = Query(default=True, description="Also save to the Distraction Parking Lot"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Session not found.")
    session.distractions = [*(session.distractions or []), payload.text]
    session.interruptions = (session.interruptions or 0) + 1
    if park:
        db.add(BrainDump(user_id=user.id, text=payload.text, category="ideas", parking_lot=True))
    db.commit()
    db.refresh(session)
    return session
