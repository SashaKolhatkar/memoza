"""Transparent, rule-based adaptive scheduling engine.

No machine learning is used here. Every block produced by this module carries a
human-readable reason so the user can understand and override the suggestion.
The engine never mutates tasks and never reschedules anything automatically.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.schemas import ScheduleRequest

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@dataclass
class Interval:
    start: datetime
    end: datetime
    label: str


@dataclass
class Candidate:
    id: str
    title: str
    minutes: float
    energy: str
    importance: int
    priority: str
    pinned: bool
    due_at: datetime | None
    scheduled_start: datetime | None
    first_action: str
    score: float = 0.0
    reason: str = ""


def parse_day(day: str) -> date:
    return date.fromisoformat(day)


def clock(value: str, day: date) -> datetime:
    hour, minute = (int(part) for part in value.split(":")[:2])
    return datetime.combine(day, time(hour=hour, minute=minute))


def _score(candidate: Candidate, today: date, energy: str, now: datetime) -> tuple[str, float]:
    reasons: list[str] = []
    score = float(candidate.importance - 1) * 3
    if candidate.priority == "high":
        score += 7
        reasons.append("high priority")
    elif candidate.priority == "normal":
        score += 2
    if candidate.pinned:
        score += 8
        reasons.append("you pinned it")

    if candidate.due_at:
        due_day = candidate.due_at.date()
        if due_day < today:
            score += 12
            reasons.append("deadline has passed")
        elif due_day == today:
            score += 9
            reasons.append("deadline is today")
        elif (due_day - today).days == 1:
            score += 4
            reasons.append("deadline is tomorrow")
        else:
            score += max(0, 3 - (due_day - today).days // 3)

    if candidate.scheduled_start and candidate.scheduled_start.date() == today and candidate.scheduled_start < now:
        score += 5
        reasons.append("its earlier time slot was missed")

    if candidate.energy == energy:
        score += 3
        reasons.append("matches your energy")
    elif candidate.energy == "high" and energy == "low":
        score -= 4

    if candidate.minutes <= 25:
        score += 1.5
        reasons.append("short enough to fit easily")

    return "; ".join(reasons) or "steady progress toward your goals", score


def _occupied(events: list, day: date) -> list[Interval]:
    blocks: list[Interval] = []
    for event in events:
        start = event.start_at - timedelta(minutes=(event.prep_minutes or 0) + (event.travel_minutes or 0))
        end = event.end_at or (event.start_at + timedelta(minutes=60))
        if end.date() < day or start.date() > day:
            continue
        blocks.append(Interval(start, end, f"{event.title} (including preparation)"))
    return sorted(blocks, key=lambda block: block.start)


def _free_gap(cursor: datetime, limit: datetime, busy: list[Interval]) -> tuple[datetime, datetime | None]:
    for interval in busy:
        if interval.end <= cursor:
            continue
        if interval.start >= limit:
            break
        if interval.start > cursor:
            return cursor, min(interval.start, limit)
        cursor = max(cursor, interval.end)
    return cursor, limit if cursor < limit else None


def propose_schedule(request: ScheduleRequest, tasks: list, events: list, now: datetime | None = None) -> dict:
    now = now or datetime.now()
    day = parse_day(request.day)
    window_start = clock(request.available_start, day)
    window_end = clock(request.available_end, day)
    if window_end <= window_start:
        window_end = window_start + timedelta(hours=8)

    cursor = max(window_start, now) if day == now.date() else window_start
    busy = _occupied(events, day) if (request.include_events and request.respect_fixed_blocks) else []
    generation_id = __import__("uuid").uuid4().hex[:16]

    eligible = [
        task for task in tasks
        if task.status in {"today", "upcoming"}
    ]
    if request.task_ids is not None:
        eligible = [task for task in eligible if task.id in request.task_ids]

    candidates: list[Candidate] = []
    for task in eligible:
        due_day = task.due_at.date() if task.due_at else None
        if task.status == "upcoming" and due_day and due_day > day + timedelta(days=7):
            continue
        minutes = float(task.estimated_minutes or 25)
        candidate = Candidate(
            id=task.id,
            title=task.title,
            minutes=minutes,
            energy=task.energy or "medium",
            importance=task.importance or 3,
            priority=task.priority or "normal",
            pinned=bool(task.pinned),
            due_at=task.due_at,
            scheduled_start=task.scheduled_start,
            first_action=task.first_action or "",
        )
        candidate.reason, candidate.score = _score(candidate, day, request.energy, now)
        candidates.append(candidate)

    candidates.sort(key=lambda item: (-item.score, item.title.lower()))

    window_minutes = max(0, int((window_end - cursor).total_seconds() // 60))
    busy_minutes = sum(
        max(0, int((min(block.end, window_end) - max(block.start, cursor)).total_seconds() // 60))
        for block in busy
    )
    budget = max(0, int((window_minutes - busy_minutes) * 0.85))  # deliberate under-booking

    blocks: list[dict] = []
    unscheduled: list[dict] = []
    notes: list[str] = []
    used_minutes = 0

    gap_start, gap_end = _free_gap(cursor, window_end, busy)
    for candidate in candidates:
        duration = min(candidate.minutes, request.max_focus_block)
        if duration <= 0:
            continue
        if candidate.minutes > request.max_focus_block:
            notes.append(
                f"“{candidate.title}” is longer than one focus block. Only one block was suggested; "
                "the rest can be planned in a later session."
            )

        if used_minutes + duration > budget:
            unscheduled.append({
                "task_id": candidate.id,
                "title": candidate.title,
                "reason": "Not enough room without overbooking your day. Nothing was moved.",
            })
            continue

        # Find the next gap that fits this block plus a following buffer.
        while gap_end is not None:
            available = int((gap_end - gap_start).total_seconds() // 60)
            if available >= duration:
                break
            if gap_end < window_end:
                next_start = next((b.end for b in busy if b.end > gap_end), None)
                if next_start:
                    gap_start, gap_end = _free_gap(max(gap_start, next_start), window_end, busy)
                    continue
            gap_start, gap_end = gap_end, None

        if gap_end is None or gap_start is None:
            unscheduled.append({
                "task_id": candidate.id,
                "title": candidate.title,
                "reason": "No free slot remained in your chosen window.",
            })
            continue

        block_start = gap_start
        block_end = block_start + timedelta(minutes=duration)
        blocks.append({
            "task_id": candidate.id,
            "kind": "task",
            "label": candidate.title,
            "start_at": block_start,
            "end_at": block_end,
            "reason": candidate.reason,
        })
        used_minutes += duration
        gap_start = block_end

        after_block = gap_start + timedelta(minutes=request.buffer_minutes)
        if request.break_minutes and used_minutes < budget:
            gap_start = after_block + timedelta(minutes=request.break_minutes)
            blocks.append({
                "task_id": None,
                "kind": "break",
                "label": "Short break",
                "start_at": after_block,
                "end_at": gap_start,
                "reason": "A small pause between focus blocks.",
            })
        else:
            gap_start = after_block
        gap_start, gap_end = _free_gap(gap_start, window_end, busy)

    for block in busy:
        event_start = max(block.start, window_start)
        event_end = min(block.end, window_end)
        if event_end <= event_start:
            continue
        blocks.append({
            "task_id": None,
            "kind": "event",
            "label": block.label,
            "start_at": event_start,
            "end_at": event_end,
            "reason": "Already in your calendar — kept as a fixed point.",
        })

    blocks.sort(key=lambda block: block["start_at"])
    notes.append("This is a suggestion, not a decision. Tasks stay where they are until you apply the plan.")
    if unscheduled:
        notes.append(f"{len(unscheduled)} task(s) were left unscheduled on purpose. You can decide what happens to them.")

    return {
        "generation_id": generation_id,
        "day": request.day,
        "source": "rule_based",
        "blocks": blocks,
        "unscheduled": unscheduled,
        "summary": {
            "scheduled_count": len([b for b in blocks if b["kind"] == "task"]),
            "focus_minutes": used_minutes,
            "unscheduled_count": len(unscheduled),
            "available_minutes": window_minutes,
            "buffer_minutes": request.buffer_minutes,
            "energy": request.energy,
            "weekday": DAY_NAMES[day.weekday()],
        },
        "notes": notes,
    }


def rank_priorities(tasks: list, now: datetime | None = None, limit: int = 3) -> list[dict]:
    """Rank open tasks for the 'Choose one priority' restart option."""
    now = now or datetime.now()
    today = now.date()
    ranked: list[dict] = []
    for task in tasks:
        if task.status in {"done", "archived"}:
            continue
        reasons = []
        score = float((task.importance or 3) - 1) * 3
        if task.priority == "high":
            score += 7
            reasons.append("marked important")
        if task.pinned:
            score += 5
            reasons.append("you pinned it")
        if task.due_at:
            delta = (task.due_at.date() - today).days
            if delta < 0:
                score += 11
                reasons.append("its deadline has passed")
            elif delta == 0:
                score += 8
                reasons.append("its deadline is today")
            elif delta <= 3:
                score += 3
                reasons.append("its deadline is close")
        if (task.estimated_minutes or 25) <= 25:
            score += 2
            reasons.append("small enough to start today")
        ranked.append({
            "task_id": task.id,
            "title": task.title,
            "reason": "; ".join(reasons) or "a steady step forward",
            "first_action": task.first_action or "",
            "score": score,
        })
    ranked.sort(key=lambda item: -item["score"])
    return ranked[:limit]
