import hashlib
import re
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.models import TrafficHit, User, utcnow
from app.rate_limit import check_rate_limit
from app.schemas import (
    OwnerTrafficOut,
    TrafficIn,
    TrafficRecent,
    TrafficRow,
    TrafficSummary,
    TrafficViewIn,
)

router = APIRouter(tags=["owner traffic"])

APP_PATHS = {
    "/", "/tasks", "/brain-dump", "/focus", "/matrix", "/rough-draft",
    "/routines", "/calendar", "/progress", "/insights", "/time", "/settings",
    "/owner",
}
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{8,200}$")


def _hash_token(value: str) -> str:
    return hashlib.sha256(f"{settings.traffic_salt}:{value}".encode("utf-8")).hexdigest()


def _normalize_path(value: str) -> str:
    path = value.split("?", 1)[0].split("#", 1)[0].strip()
    if len(path) > 1:
        path = path.rstrip("/")
    return path if path in APP_PATHS else "/other"


def _clean_host(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9.\-:]", "", value or "")[:120]


def _require_owner(user: User = Depends(get_current_user)) -> User:
    if not user.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access only.")
    return user


@router.post("/api/traffic/view", response_model=TrafficIn, status_code=status.HTTP_202_ACCEPTED)
def record_view(payload: TrafficViewIn, request: Request, db: Session = Depends(get_db)):
    """Record a privacy-light page view. Public, because every visitor has no account yet."""
    check_rate_limit(request, "traffic", limit=120, window_seconds=60)
    if not TOKEN_RE.fullmatch(payload.visitor_id) or not TOKEN_RE.fullmatch(payload.session_id):
        return TrafficIn(ok=True, counted=False)

    path = _normalize_path(payload.path)
    visitor_hash = _hash_token(payload.visitor_id)
    session_hash = _hash_token(payload.session_id)
    recent = db.scalar(
        select(TrafficHit.id)
        .where(
            TrafficHit.session_hash == session_hash,
            TrafficHit.path == path,
            TrafficHit.created_at >= utcnow() - timedelta(seconds=30),
        )
        .limit(1)
    )
    if recent:
        return TrafficIn(ok=True, counted=False)

    cutoff = utcnow() - timedelta(days=max(1, settings.traffic_retention_days))
    db.execute(delete(TrafficHit).where(TrafficHit.created_at < cutoff))

    now = utcnow()
    db.add(TrafficHit(
        day=now.strftime("%Y-%m-%d"),
        path=path,
        visitor_hash=visitor_hash,
        session_hash=session_hash,
        device=payload.device,
        referrer_host=_clean_host(payload.referrer_host),
        created_at=now,
    ))
    db.commit()
    return TrafficIn(ok=True, counted=True)


def _rows(hits: list[TrafficHit], key) -> list[TrafficRow]:
    views: dict[str, int] = {}
    visitors: dict[str, set[str]] = {}
    for hit in hits:
        label = str(key(hit) or "unknown")
        views[label] = views.get(label, 0) + 1
        visitors.setdefault(label, set()).add(hit.visitor_hash)
    return [
        TrafficRow(label=label, views=count, visitors=len(visitors[label]))
        for label, count in sorted(views.items(), key=lambda item: (-item[1], item[0]))
    ]


@router.get("/api/owner/traffic", response_model=OwnerTrafficOut)
def owner_traffic(
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_require_owner),
):
    """Aggregated site traffic. Only the configured owner email can read this."""
    since = utcnow() - timedelta(days=days)
    hits = list(db.scalars(
        select(TrafficHit).where(TrafficHit.created_at >= since).order_by(TrafficHit.created_at.asc())
    ).all())

    summary = TrafficSummary(
        views=len(hits),
        unique_visitors=len({hit.visitor_hash for hit in hits}),
        unique_sessions=len({hit.session_hash for hit in hits}),
        days_with_views=len({hit.day for hit in hits}),
        first_view=hits[0].created_at if hits else None,
        last_view=hits[-1].created_at if hits else None,
    )
    daily_rows = _rows(hits, lambda hit: hit.day)
    daily_rows.sort(key=lambda row: row.label)

    return OwnerTrafficOut(
        summary=summary,
        daily=daily_rows,
        pages=_rows(hits, lambda hit: hit.path),
        devices=_rows(hits, lambda hit: hit.device),
        referrers=_rows(hits, lambda hit: hit.referrer_host or "direct"),
        recent=[
            TrafficRecent(
                at=hit.created_at,
                path=hit.path,
                device=hit.device,
                referrer_host=hit.referrer_host,
            )
            for hit in hits[-12:][::-1]
        ],
        note="Privacy-light: hashed visitor IDs only. No IP addresses, names, task text, or raw user agents are stored.",
    )
