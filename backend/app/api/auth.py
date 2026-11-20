from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.db import get_db
from app.rate_limit import check_rate_limit
from app.services import ml
from app.services.token_crypto import decrypt_secret
from app.models import (
    BrainDump,
    CalendarEvent,
    FocusSession,
    GoogleConnection,
    Routine,
    RoutineLog,
    ScheduleBlock,
    Task,
    TaskEvent,
    User,
    utcnow,
)
from app.schemas import (
    BrainDumpOut as BrainDumpSchema,
    EventOut as EventSchema,
    ExportOut,
    LoginIn,
    PreferencesIn,
    RegisterIn,
    RoutineLogOut as RoutineLogSchema,
    RoutineOut as RoutineSchema,
    ScheduleBlockOut as ScheduleBlockSchema,
    SessionOut as SessionSchema,
    TaskEventOut as TaskEventSchema,
    TaskOut as TaskSchema,
    TokenOut,
    UserOut,
)
from app.seed import DEMO_PASSWORD, ensure_demo_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

_DUMMY_HASH = hash_password("not-a-real-password")


def ensure_owner_account(db: Session) -> None:
    """Backfill the configured owner email from older databases."""
    email = settings.owner_email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user and not user.is_owner:
        user.is_owner = True
        db.commit()


def _token_response(user: User) -> TokenOut:
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request, "register", limit=5, window_seconds=3600)
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    is_owner = False
    if payload.email == settings.owner_email.strip().lower():
        if not settings.owner_setup_token or payload.owner_setup_token != settings.owner_setup_token:
            raise HTTPException(status_code=403, detail="This email is reserved for the owner account.")
        is_owner = True
    user = User(
        email=payload.email,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        is_owner=is_owner,
        preferences={
            "theme": "light",
            "reduceMotion": False,
            "gentleReminders": True,
            "breakReminders": True,
            "defaultSessionMinutes": 25,
            "defaultBreakMinutes": 10,
            "buddyName": "",
            "buddyCharacter": "auto",
            "buddyColor": "default",
            "musicEnabled": False,
            "musicSource": "audio",
            "musicAudioId": "senbazuru",
            "musicVideoId": "KNdjMEcG0mw",
            "notificationPreferences": {"tasks": True, "events": True, "routines": False, "sound": False},
        },
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request, "login", limit=10, window_seconds=60)
    user = db.scalar(select(User).where(User.email == payload.email))
    valid = verify_password(payload.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _token_response(user)


@router.post("/demo", response_model=TokenOut)
def demo_login(request: Request, db: Session = Depends(get_db)):
    """Enter a clearly labelled demo workspace with sample data."""
    check_rate_limit(request, "demo", limit=60, window_seconds=60)
    user = ensure_demo_user(db)
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/me/preferences", response_model=UserOut)
def update_preferences(payload: PreferencesIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    merged = {**(user.preferences or {}), **payload.preferences}
    user.preferences = merged
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/export", response_model=ExportOut)
def export_data(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    def export_rows(model, schema):
        return [
            schema.model_validate(row).model_dump(mode="json")
            for row in db.scalars(select(model).where(model.user_id == user.id)).all()
        ]

    return ExportOut(
        exported_at=utcnow(),
        user=UserOut.model_validate(user),
        data={
            "tasks": export_rows(Task, TaskSchema),
            "task_events": export_rows(TaskEvent, TaskEventSchema),
            "braindumps": export_rows(BrainDump, BrainDumpSchema),
            "routines": export_rows(Routine, RoutineSchema),
            "routine_logs": export_rows(RoutineLog, RoutineLogSchema),
            "events": export_rows(CalendarEvent, EventSchema),
            "focus_sessions": export_rows(FocusSession, SessionSchema),
            "schedule_blocks": export_rows(ScheduleBlock, ScheduleBlockSchema),
        },
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Permanently delete the account and all of its personal data."""
    google = db.scalar(select(GoogleConnection).where(GoogleConnection.user_id == user.id))
    refresh_token = decrypt_secret(google.refresh_token) if google else None
    if refresh_token:
        try:
            httpx.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": refresh_token},
                timeout=10,
            )
        except httpx.HTTPError:
            pass  # Local deletion must still finish if Google is unreachable.
    for model in (GoogleConnection, TaskEvent, ScheduleBlock, FocusSession, RoutineLog, BrainDump, Routine, CalendarEvent, Task):
        for row in db.scalars(select(model).where(model.user_id == user.id)).all():
            db.delete(row)
    db.delete(user)
    db.commit()
    ml.delete_user_models(user.id)
    return None
