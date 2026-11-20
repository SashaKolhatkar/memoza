import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    # Naive UTC keeps SQLite and PostgreSQL behaviour identical.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    braindumps: Mapped[list["BrainDump"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    routines: Mapped[list["Routine"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    events: Mapped[list["CalendarEvent"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["FocusSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    blocks: Mapped[list["ScheduleBlock"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_user_status", "user_id", "status"),
        Index("ix_tasks_user_due", "user_id", "due_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(400))
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(24), default="today")  # today|upcoming|someday|done|archived
    priority: Mapped[str] = mapped_column(String(16), default="normal")  # low|normal|high
    importance: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    category: Mapped[str] = mapped_column(String(60), default="general")
    difficulty_reason: Mapped[str | None] = mapped_column(String(60), nullable=True)
    first_action: Mapped[str] = mapped_column(Text, default="")
    energy: Mapped[str] = mapped_column(String(16), default="medium")  # low|medium|high
    estimated_minutes: Mapped[float] = mapped_column(Float, default=25.0)
    actual_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_main_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    rough_mode: Mapped[str] = mapped_column(String(24), default="off")  # off|rough|good_enough|polish_later
    done_enough: Mapped[str] = mapped_column(Text, default="")
    milestones: Mapped[list] = mapped_column(JSON, default=list)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(32), default="manual")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User] = relationship(back_populates="tasks")
    events: Mapped[list["TaskEvent"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskEvent(Base):
    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(48))  # created|started|paused|completed|rescheduled|...
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    task: Mapped[Task] = relationship(back_populates="events")


class BrainDump(Base):
    __tablename__ = "braindumps"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(24), default="ideas")  # today|upcoming|reminders|ideas|someday
    parking_lot: Mapped[bool] = mapped_column(Boolean, default=False)
    converted_task_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="braindumps")


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    full_steps: Mapped[list] = mapped_column(JSON, default=list)
    short_steps: Mapped[list] = mapped_column(JSON, default=list)
    minimum_steps: Mapped[list] = mapped_column(JSON, default=list)
    time_of_day: Mapped[str] = mapped_column(String(24), default="morning")
    days: Mapped[list] = mapped_column(JSON, default=list)  # 0=Monday ... 6=Sunday
    reminder_time: Mapped[str | None] = mapped_column(String(8), nullable=True)  # "07:30"
    optional: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="routines")
    logs: Mapped[list["RoutineLog"]] = relationship(back_populates="routine", cascade="all, delete-orphan")


class RoutineLog(Base):
    __tablename__ = "routine_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    routine_id: Mapped[str] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"), index=True)
    version: Mapped[str] = mapped_column(String(16), default="full")  # full|short|minimum
    day: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    routine: Mapped[Routine] = relationship(back_populates="logs")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    event_type: Mapped[str] = mapped_column(String(24), default="appointment")  # appointment|deadline|personal
    start_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=0)
    travel_minutes: Mapped[int] = mapped_column(Integer, default=0)
    reminder_minutes: Mapped[int] = mapped_column(Integer, default=30)
    location: Mapped[str] = mapped_column(String(240), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(32), default="manual")  # manual|external (future)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="events")


class GoogleConnection(Base):
    """Optional read-only Google Calendar connection, one per user."""

    __tablename__ = "google_connections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    access_token: Mapped[str] = mapped_column(Text, default="")
    refresh_token: Mapped[str] = mapped_column(Text, default="")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    mode: Mapped[str] = mapped_column(String(24), default="task")  # task|break|breather
    planned_minutes: Mapped[float] = mapped_column(Float, default=25.0)
    actual_minutes: Mapped[float] = mapped_column(Float, default=0.0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    accomplished: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    distractions: Mapped[list] = mapped_column(JSON, default=list)
    interruptions: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class ScheduleBlock(Base):
    __tablename__ = "schedule_blocks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[str] = mapped_column(String(24), default="task")  # task|break|buffer|event
    label: Mapped[str] = mapped_column(String(240), default="")
    start_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    generation_id: Mapped[str] = mapped_column(String(32), default=new_id)

    user: Mapped[User] = relationship(back_populates="blocks")


class TrafficHit(Base):
    """Privacy-light page view. Never stores IP, name, task text, or raw user agent."""

    __tablename__ = "traffic_hits"
    __table_args__ = (
        Index("ix_traffic_created_at", "created_at"),
        Index("ix_traffic_session_path", "session_hash", "path", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    day: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-DD (UTC)
    path: Mapped[str] = mapped_column(String(120))
    visitor_hash: Mapped[str] = mapped_column(String(64), index=True)
    session_hash: Mapped[str] = mapped_column(String(64), index=True)
    device: Mapped[str] = mapped_column(String(16), default="desktop")  # mobile|tablet|desktop
    referrer_host: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
