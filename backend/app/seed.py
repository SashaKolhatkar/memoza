"""Clearly labelled demo workspace. No personal or behavioural data is invented."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import (
    BrainDump,
    CalendarEvent,
    FocusSession,
    Routine,
    RoutineLog,
    ScheduleBlock,
    Task,
    User,
    utcnow,
)

DEMO_EMAIL = "demo@memoza.local"
DEMO_PASSWORD = "demo1234"


def _at(day_offset: int, hour: int, minute: int = 0) -> datetime:
    now = utcnow()
    return (now + timedelta(days=day_offset)).replace(hour=hour, minute=minute, second=0, microsecond=0)


def create_demo_user(db: Session) -> User:
    user = User(
        email=DEMO_EMAIL,
        name="Demo Workspace",
        password_hash=hash_password(DEMO_PASSWORD),
        is_demo=True,
        preferences={
            "theme": "light",
            "reduceMotion": False,
            "gentleReminders": True,
            "breakReminders": True,
            "defaultSessionMinutes": 25,
            "defaultBreakMinutes": 10,
            "musicEnabled": False,
            "musicSource": "audio",
            "musicAudioId": "senbazuru",
            "musicVideoId": "KNdjMEcG0mw",
            "notificationPreferences": {
                "tasks": True,
                "events": True,
                "routines": False,
                "sound": False,
            },
        },
    )
    db.add(user)
    db.flush()

    tasks = [
        Task(user_id=user.id, title="Draft the project outline", status="today", importance=5, priority="high",
             category="work", difficulty_reason="quality", first_action="Open a blank page and write three rough headings.",
             energy="high", estimated_minutes=45, rough_mode="rough",
             done_enough="A messy outline with a beginning, middle and end.",
             milestones=[{"id": "m1", "title": "Write rough headings", "done": False},
                         {"id": "m2", "title": "Add two bullet points per heading", "done": False}],
             due_at=_at(0, 17), is_main_priority=True, is_demo=True, position=0),
        Task(user_id=user.id, title="Reply to the scheduling email", status="today", importance=3, priority="normal",
             category="admin", difficulty_reason="unmotivated", first_action="Open the email and write the greeting only.",
             estimated_minutes=15, is_demo=True, position=1),
        Task(user_id=user.id, title="Read chapter 4 of the course book", status="today", importance=4, priority="normal",
             category="study", difficulty_reason="overwhelming", first_action="Read the first page and note one idea.",
             energy="medium", estimated_minutes=35, is_demo=True, position=2),
        Task(user_id=user.id, title="Plan a gentle evening routine", status="today", importance=2, priority="low",
             category="personal", estimated_minutes=15, energy="low", is_demo=True, position=3),
        Task(user_id=user.id, title="Prepare slides for Friday", status="upcoming", importance=4, priority="high",
             category="work", difficulty_reason="unknown", estimated_minutes=60, due_at=_at(2, 12),
             rough_mode="good_enough", done_enough="Five readable slides, not perfect ones.", is_demo=True),
        Task(user_id=user.id, title="Book a dental appointment", status="upcoming", importance=2, category="health",
             estimated_minutes=10, due_at=_at(5, 18), is_demo=True),
        Task(user_id=user.id, title="Organise the reference folder", status="someday", importance=2,
             category="admin", estimated_minutes=40, is_demo=True),
        Task(user_id=user.id, title="Write a short reflection", status="done", importance=3, category="personal",
             estimated_minutes=25, actual_minutes=20, completed_at=_at(-1, 16), is_demo=True),
    ]
    db.add_all(tasks)

    db.add_all([
        BrainDump(user_id=user.id, text="Ask about the new timeline", category="today", is_demo=True),
        BrainDump(user_id=user.id, text="That song I heard on the way home", category="ideas", is_demo=True),
        BrainDump(user_id=user.id, text="Look into a better desk lamp", category="someday", is_demo=True),
        BrainDump(user_id=user.id, text="Remember to check the train time", category="reminders", is_demo=True),
        BrainDump(user_id=user.id, text="Interesting article about typography", category="ideas",
                  parking_lot=True, is_demo=True),
    ])

    routines = [
        Routine(user_id=user.id, name="Morning landing", time_of_day="morning", reminder_time="08:00",
                full_steps=["Drink water", "Open the curtains", "Write today's one priority", "Five-minute stretch"],
                short_steps=["Drink water", "Write today's one priority"],
                minimum_steps=["Sit up and take three breaths"], is_demo=True),
        Routine(user_id=user.id, name="Evening wind-down", time_of_day="evening", reminder_time="21:00",
                full_steps=["Tidy the desk", "Lay out tomorrow's materials", "Read for ten minutes"],
                short_steps=["Lay out tomorrow's materials"],
                minimum_steps=["Turn off the bright light"], optional=True, is_demo=True),
    ]
    db.add_all(routines)
    db.flush()
    for routine in routines:
        for offset, version in [(-2, "full"), (-1, "short"), (0, "minimum")]:
            db.add(RoutineLog(user_id=user.id, routine_id=routine.id, version=version,
                              day=_at(offset, 12).date().isoformat(), completed=True))

    db.add_all([
        CalendarEvent(user_id=user.id, title="Team check-in", event_type="appointment",
                      start_at=_at(0, 11), end_at=_at(0, 11, 30), prep_minutes=10, reminder_minutes=15,
                      location="Video call", is_demo=True),
        CalendarEvent(user_id=user.id, title="Outline due", event_type="deadline",
                      start_at=_at(0, 17), prep_minutes=0, reminder_minutes=60, is_demo=True),
        CalendarEvent(user_id=user.id, title="Study group", event_type="appointment",
                      start_at=_at(1, 15), end_at=_at(1, 16, 30), travel_minutes=20, is_demo=True),
    ])

    db.add_all([
        FocusSession(user_id=user.id, task_id=tasks[7].id, mode="task", planned_minutes=25, actual_minutes=20,
                     started_at=_at(-1, 15, 30), ended_at=_at(-1, 15, 50), accomplished="Wrote the first paragraph",
                     completed=True, is_demo=True),
        FocusSession(user_id=user.id, mode="break", planned_minutes=10, actual_minutes=10,
                     started_at=_at(-1, 15, 50), ended_at=_at(-1, 16), completed=True, is_demo=True),
    ])

    db.commit()
    db.refresh(user)
    return user


def ensure_demo_user(db: Session) -> User:
    from sqlalchemy import select

    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user:
        return user
    return create_demo_user(db)


def has_demo_data(db: Session) -> bool:
    from sqlalchemy import select

    return db.scalar(select(User.id).where(User.email == DEMO_EMAIL).limit(1)) is not None
