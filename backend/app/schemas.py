import re
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import new_id


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


_DAY_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_CLOCK_PATTERN = re.compile(r"^\d{1,2}:\d{2}$")


def validated_day(value: str) -> str:
    if not _DAY_PATTERN.fullmatch(value):
        raise ValueError("Use YYYY-MM-DD.")
    date.fromisoformat(value)
    return value


def validated_clock(value: str) -> str:
    if not _CLOCK_PATTERN.fullmatch(value):
        raise ValueError("Use HH:MM.")
    datetime.strptime(value, "%H:%M")
    return value


# --------------------------------------------------------------------------- auth
class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=120)
    owner_setup_token: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def limit_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return value


class LoginIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def limit_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return value


class UserOut(ORMModel):
    id: str
    email: str
    name: str
    is_demo: bool
    is_owner: bool = False
    preferences: dict[str, Any]
    created_at: datetime

    @model_validator(mode="after")
    def normalize_owner(self):
        self.is_owner = bool(self.is_owner)
        return self


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --------------------------------------------------------------------------- tasks
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    notes: str = ""
    status: Literal["today", "upcoming", "someday"] = "today"
    priority: Literal["low", "normal", "high"] = "normal"
    importance: int = Field(default=3, ge=1, le=5)
    category: str = "general"
    difficulty_reason: str | None = None
    first_action: str = ""
    energy: Literal["low", "medium", "high"] = "medium"
    estimated_minutes: float = Field(default=25, gt=0, le=1440)
    due_at: datetime | None = None
    rough_mode: Literal["off", "rough", "good_enough", "polish_later"] = "off"
    done_enough: str = ""
    milestones: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False
    source: str = "manual"


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=400)
    notes: str | None = None
    status: Literal["today", "upcoming", "someday", "done", "archived"] | None = None
    priority: Literal["low", "normal", "high"] | None = None
    importance: int | None = Field(default=None, ge=1, le=5)
    category: str | None = None
    difficulty_reason: str | None = None
    first_action: str | None = None
    energy: Literal["low", "medium", "high"] | None = None
    estimated_minutes: float | None = Field(default=None, gt=0, le=1440)
    actual_minutes: float | None = Field(default=None, ge=0, le=1440)
    due_at: datetime | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    pinned: bool | None = None
    is_main_priority: bool | None = None
    rough_mode: Literal["off", "rough", "good_enough", "polish_later"] | None = None
    done_enough: str | None = None
    milestones: list[dict[str, Any]] | None = None
    tags: list[str] | None = None
    position: int | None = None
    source: str | None = None


class TaskOut(ORMModel):
    id: str
    user_id: str
    title: str
    notes: str
    status: str
    priority: str
    importance: int
    category: str
    difficulty_reason: str | None
    first_action: str
    energy: str
    estimated_minutes: float
    actual_minutes: float | None
    due_at: datetime | None
    scheduled_start: datetime | None
    scheduled_end: datetime | None
    pinned: bool
    is_main_priority: bool
    rough_mode: str
    done_enough: str
    milestones: list[dict[str, Any]]
    tags: list[str]
    position: int
    source: str
    is_demo: bool
    created_at: datetime
    completed_at: datetime | None
    started_at: datetime | None


class TaskEventOut(ORMModel):
    id: str
    task_id: str
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class TaskReorderIn(BaseModel):
    ids: list[str] = Field(max_length=200)


class MissedTaskActionIn(BaseModel):
    action: Literal["reschedule", "break_down", "reduce_scope", "move_to_another_day", "remove"]
    target_date: str | None = None  # YYYY-MM-DD

    @field_validator("action")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()

    @field_validator("target_date")
    @classmethod
    def check_target_date(cls, value: str | None) -> str | None:
        return validated_day(value) if value else value


# --------------------------------------------------------------------------- brain dump
class BrainDumpCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    category: Literal["today", "upcoming", "reminders", "ideas", "someday"] = "ideas"
    parking_lot: bool = False


class BrainDumpUpdate(BaseModel):
    text: str | None = None
    category: Literal["today", "upcoming", "reminders", "ideas", "someday"] | None = None
    parking_lot: bool | None = None


class BrainDumpOut(ORMModel):
    id: str
    text: str
    category: str
    parking_lot: bool
    converted_task_id: str | None
    is_demo: bool
    created_at: datetime


# --------------------------------------------------------------------------- routines
class RoutineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    full_steps: list[str] = Field(default_factory=list)
    short_steps: list[str] = Field(default_factory=list)
    minimum_steps: list[str] = Field(default_factory=list)
    time_of_day: str = "morning"
    days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    reminder_time: str | None = None
    optional: bool = False


class RoutineUpdate(BaseModel):
    name: str | None = None
    full_steps: list[str] | None = None
    short_steps: list[str] | None = None
    minimum_steps: list[str] | None = None
    time_of_day: str | None = None
    days: list[int] | None = None
    reminder_time: str | None = None
    optional: bool | None = None


class RoutineOut(ORMModel):
    id: str
    name: str
    full_steps: list[str]
    short_steps: list[str]
    minimum_steps: list[str]
    time_of_day: str
    days: list[int]
    reminder_time: str | None
    optional: bool
    is_demo: bool
    created_at: datetime


class RoutineLogIn(BaseModel):
    version: Literal["full", "short", "minimum"]
    day: str
    completed: bool = True
    note: str = ""

    @field_validator("day")
    @classmethod
    def check_day(cls, value: str) -> str:
        return validated_day(value)


class RoutineLogOut(ORMModel):
    id: str
    routine_id: str
    version: str
    day: str
    completed: bool
    note: str
    created_at: datetime


# --------------------------------------------------------------------------- events
class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    event_type: Literal["appointment", "deadline", "personal"] = "appointment"
    start_at: datetime
    end_at: datetime | None = None
    prep_minutes: int = Field(default=0, ge=0, le=480)
    travel_minutes: int = Field(default=0, ge=0, le=480)
    reminder_minutes: int = Field(default=30, ge=0, le=10080)
    location: str = ""
    notes: str = ""
    source: str = "manual"


class EventUpdate(BaseModel):
    title: str | None = None
    event_type: Literal["appointment", "deadline", "personal"] | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    prep_minutes: int | None = None
    travel_minutes: int | None = None
    reminder_minutes: int | None = None
    location: str | None = None
    notes: str | None = None


class EventOut(ORMModel):
    id: str
    title: str
    event_type: str
    start_at: datetime
    end_at: datetime | None
    prep_minutes: int
    travel_minutes: int
    reminder_minutes: int
    location: str
    notes: str
    source: str
    is_demo: bool
    created_at: datetime


# --------------------------------------------------------------------------- focus sessions
class SessionCreate(BaseModel):
    task_id: str | None = None
    mode: Literal["task", "break", "breather"] = "task"
    planned_minutes: float = Field(default=25, gt=0, le=240)


class SessionUpdate(BaseModel):
    actual_minutes: float | None = Field(default=None, ge=0, le=1440)
    accomplished: str | None = None
    notes: str | None = None
    distractions: list[str] | None = None
    interruptions: int | None = None
    completed: bool | None = None
    ended_at: datetime | None = None


class SessionOut(ORMModel):
    id: str
    task_id: str | None
    mode: str
    planned_minutes: float
    actual_minutes: float
    started_at: datetime
    ended_at: datetime | None
    accomplished: str
    notes: str
    distractions: list[str]
    interruptions: int
    completed: bool
    is_demo: bool


class DistractionIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)


# --------------------------------------------------------------------------- scheduling
class ScheduleRequest(BaseModel):
    day: str  # YYYY-MM-DD
    energy: Literal["low", "medium", "high"] = "medium"
    available_start: str = "09:00"  # HH:MM
    available_end: str = "18:00"
    buffer_minutes: int = Field(default=10, ge=0, le=120)
    break_minutes: int = Field(default=10, ge=0, le=120)
    max_focus_block: int = Field(default=50, ge=15, le=180)
    task_ids: list[str] | None = Field(default=None, max_length=200)  # None = all open tasks for the day
    include_events: bool = True
    respect_fixed_blocks: bool = True

    @field_validator("day")
    @classmethod
    def check_day(cls, value: str) -> str:
        return validated_day(value)

    @field_validator("available_start", "available_end")
    @classmethod
    def check_clock(cls, value: str) -> str:
        return validated_clock(value)


class ScheduleBlockOut(ORMModel):
    id: str
    task_id: str | None
    kind: str
    label: str
    start_at: datetime
    end_at: datetime
    pinned: bool
    generation_id: str


class ScheduleProposalBlock(BaseModel):
    task_id: str | None
    kind: str
    label: str
    start_at: datetime
    end_at: datetime
    reason: str


class ScheduleProposal(BaseModel):
    generation_id: str
    day: str
    source: str = "rule_based"
    blocks: list[ScheduleProposalBlock]
    unscheduled: list[dict[str, Any]]
    summary: dict[str, Any]
    notes: list[str]


class ApplyScheduleIn(BaseModel):
    generation_id: str
    day: str
    blocks: list[ScheduleProposalBlock] = Field(max_length=200)
    apply_task_times: bool = True

    @field_validator("day")
    @classmethod
    def check_day(cls, value: str) -> str:
        return validated_day(value)


# --------------------------------------------------------------------------- restart
class RestartPriorityOut(BaseModel):
    task_id: str
    title: str
    reason: str
    first_action: str
    score: float


class RestartRebuildIn(BaseModel):
    day: str
    energy: Literal["low", "medium", "high"] = "medium"
    available_start: str = "09:00"
    available_end: str = "18:00"
    task_ids: list[str] | None = Field(default=None, max_length=200)

    @field_validator("day")
    @classmethod
    def check_day(cls, value: str) -> str:
        return validated_day(value)

    @field_validator("available_start", "available_end")
    @classmethod
    def check_clock(cls, value: str) -> str:
        return validated_clock(value)


# --------------------------------------------------------------------------- start assist / rough draft
class StartAssistIn(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    difficulty_reason: str | None = None
    category: str = "general"
    estimated_minutes: float = 25


class StartAssistOut(BaseModel):
    first_action: str
    explanation: str
    options: list[dict[str, Any]]
    reason_label: str


class RoughDraftIn(BaseModel):
    title: str
    mode: Literal["rough", "good_enough", "polish_later"]
    done_enough: str = ""


class RoughDraftOut(BaseModel):
    mode: str
    label: str
    guidance: str
    done_enough_prompt: str
    milestones: list[str]


# --------------------------------------------------------------------------- insights
class PredictDurationIn(BaseModel):
    title: str = ""
    category: str = "general"
    importance: int = 3
    difficulty_reason: str | None = None
    energy: str = "medium"
    rough_mode: str = "off"


class PredictionOut(BaseModel):
    minutes: float
    source: Literal["rule_based", "model_prediction"]
    confidence: str
    basis: str
    training_samples: int


class InsightsOut(BaseModel):
    model_status: dict[str, Any]
    total_sessions: int
    total_tasks_completed: int
    total_focus_minutes: float
    average_estimate_accuracy: float | None
    duration_history: list[dict[str, Any]]
    category_breakdown: list[dict[str, Any]]
    routine_consistency: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]


# --------------------------------------------------------------------------- misc
class PreferencesIn(BaseModel):
    preferences: dict[str, Any]


class ExportOut(BaseModel):
    exported_at: datetime
    user: UserOut
    data: dict[str, Any]


# --------------------------------------------------------------------------- owner traffic
class TrafficViewIn(BaseModel):
    path: str = Field(min_length=1, max_length=120)
    visitor_id: str = Field(min_length=8, max_length=200)
    session_id: str = Field(min_length=8, max_length=200)
    device: Literal["mobile", "tablet", "desktop"] = "desktop"
    referrer_host: str = Field(default="", max_length=120)


class TrafficIn(BaseModel):
    ok: bool
    counted: bool = False


class TrafficSummary(BaseModel):
    views: int
    unique_visitors: int
    unique_sessions: int
    days_with_views: int
    first_view: datetime | None
    last_view: datetime | None


class TrafficRow(BaseModel):
    label: str
    views: int
    visitors: int


class TrafficRecent(BaseModel):
    at: datetime
    path: str
    device: str
    referrer_host: str


class OwnerTrafficOut(BaseModel):
    summary: TrafficSummary
    daily: list[TrafficRow]
    pages: list[TrafficRow]
    devices: list[TrafficRow]
    referrers: list[TrafficRow]
    recent: list[TrafficRecent]
    note: str
