"""Start Assist: small, concrete first actions for task initiation.

This is a transparent rule-based helper. It never claims to know anything about
the user's mental state; it only responds to the difficulty they selected.
"""

import re

REASON_LABELS = {
    "unknown": "I don't know where to begin",
    "overwhelming": "The task feels overwhelming",
    "quality": "I'm worried the result won't be good enough",
    "unmotivated": "I don't feel motivated",
    "distracted": "I keep getting distracted",
}

REASON_GUIDANCE = {
    "unknown": "Clarity comes from moving, not from figuring everything out first. Let's find the smallest visible step.",
    "overwhelming": "We don't need the whole task today. We only need one piece small enough to feel doable.",
    "quality": "A rough version can always be improved. For now, the goal is simply to make something exist.",
    "unmotivated": "You don't have to feel ready. Two quiet minutes is enough to get the wheels turning.",
    "distracted": "Let's make the next two minutes small and protected. Park everything else for later.",
}

START_OPTIONS = [
    {"id": "two_minutes", "label": "Start for 2 minutes", "minutes": 2, "icon": "timer"},
    {"id": "five_minutes", "label": "Start for 5 minutes", "minutes": 5, "icon": "timer"},
    {"id": "break_down", "label": "Break task into smaller actions", "minutes": 3, "icon": "list"},
    {"id": "open_materials", "label": "Open task materials", "minutes": 2, "icon": "folder"},
    {"id": "continue", "label": "Continue, pause, or save progress", "minutes": 0, "icon": "save"},
]

_CREATIVE = re.compile(
    r"\b(write|draft|essay|report|design|draw|paint|code|build|presentation|slide|story|article|poem|video|music)\b",
    re.I,
)
_LEARNING = re.compile(r"\b(study|read|learn|revise|homework|practice|exam|course|chapter)\b", re.I)
_ADMIN = re.compile(r"\b(email|invoice|form|file|book|schedule|call|clean|pay|order|apply)\b", re.I)


def _subject(title: str) -> str:
    cleaned = re.sub(r"^(to|need to|have to|should|must|finish|complete|do)\s+", "", title.strip(), flags=re.I)
    return cleaned[:80] or "this task"


def tiny_action(title: str) -> str:
    """Return one small physical action inferred from the task title."""
    subject = _subject(title)
    lower = title.lower()
    if _CREATIVE.search(lower):
        if "slide" in lower or "presentation" in lower:
            return f"Open the presentation for “{subject}” and write one rough slide title."
        if re.search(r"\b(code|build|app|website)\b", lower):
            return f"Open the project for “{subject}” and write one comment describing the next piece."
        return f"Open a blank document for “{subject}” and write three imperfect sentences."
    if _LEARNING.search(lower):
        return f"Open the material for “{subject}” and read the first paragraph or one page."
    if _ADMIN.search(lower):
        if "email" in lower or "call" in lower:
            return f"Open the draft for “{subject}” and write the first line only."
        return f"Open what you need for “{subject}” and put the relevant item in front of you."
    return f"Open what you need for “{subject}” and spend two minutes touching it."


def suggest_first_action(title: str, difficulty_reason: str | None = None) -> str:
    reason = (difficulty_reason or "unknown").lower()
    subject = _subject(title)
    if reason == "overwhelming":
        return f"Write down the first three visible parts of “{subject}”, then stop. No doing them yet — just naming them."
    if reason == "quality":
        return f"Make a deliberately rough first pass at “{subject}”. It is allowed to be bad; it only needs to exist."
    if reason == "unmotivated":
        return f"Set a 2-minute timer and do the easiest physical movement toward “{subject}”. You may stop when it ends."
    if reason == "distracted":
        return f"Put your phone out of reach, open only what “{subject}” needs, and work for one minute."
    return tiny_action(title)


def assist(title: str, difficulty_reason: str | None = None, category: str = "general", **_: object) -> dict:
    reason = (difficulty_reason or "unknown").lower()
    if reason not in REASON_LABELS:
        reason = "unknown"
    return {
        "first_action": suggest_first_action(title, reason),
        "explanation": REASON_GUIDANCE[reason],
        "options": START_OPTIONS,
        "reason_label": REASON_LABELS[reason],
    }


ROUGH_MODES = {
    "rough": {
        "label": "Rough Draft",
        "guidance": "Create an imperfect first version. Don't reread, judge, or fix anything yet — just get it onto the page.",
        "done_enough_prompt": "What would count as a first version existing, even if it is messy?",
        "milestones": ["Open the workspace", "Make a messy first pass", "Stop and take a breath"],
    },
    "good_enough": {
        "label": "Good Enough",
        "guidance": "Decide what 'good enough' means before you start, so the finish line stays still while you work.",
        "done_enough_prompt": "Describe a realistic result you would be happy to hand in today.",
        "milestones": ["Define 'done enough'", "Work only toward that definition", "Check against the definition once"],
    },
    "polish_later": {
        "label": "Polish Later",
        "guidance": "Editing is a separate job. For this session, leave the rough edges alone and save improvement for another time.",
        "done_enough_prompt": "What can stay imperfect for now without causing a problem?",
        "milestones": ["Finish a complete version", "Write down polish ideas in a separate note", "Close the session"],
    },
}


def rough_draft(mode: str, title: str, done_enough: str = "") -> dict:
    config = ROUGH_MODES.get(mode, ROUGH_MODES["rough"])
    result = dict(config)
    result["mode"] = mode
    result["guidance"] = f"{config['guidance']} Working on: {title}."
    if done_enough:
        result["done_enough_prompt"] = f"Your definition of done enough: {done_enough}"
    return result
