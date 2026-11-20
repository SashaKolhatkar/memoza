"""Optional, read-only Google Calendar import.

Memoza never writes to a Google Calendar. Connection is only offered when
OAuth credentials are configured; tokens are kept per user in the local
database and are removed with the account.
"""

import base64
import hashlib
import secrets
import time
from datetime import date, datetime, time as day_time, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.models import CalendarEvent, GoogleConnection, User, new_id, utcnow
from app.services.token_crypto import decrypt_secret, encrypt_secret

router = APIRouter(prefix="/api/google", tags=["google"])

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
SCOPES = "https://www.googleapis.com/auth/calendar.readonly"

# Short-lived, in-memory state for the local prototype. A deployed multi-worker
# service should keep this in a shared store.
_pending: dict[str, tuple[str, float, str]] = {}


def _pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
    return verifier, challenge


def _configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri)


def _connection(db: Session, user_id: str) -> GoogleConnection | None:
    return db.scalar(select(GoogleConnection).where(GoogleConnection.user_id == user_id))


def _revoke(row: GoogleConnection) -> None:
    token = decrypt_secret(row.refresh_token) or decrypt_secret(row.access_token)
    if not token:
        return
    try:
        httpx.post("https://oauth2.googleapis.com/revoke", params={"token": token}, timeout=10)
    except httpx.HTTPError:
        pass  # Local removal must still finish if Google is unreachable.


def _status(db: Session, user: User) -> dict:
    row = _connection(db, user.id)
    connected = bool(row and row.access_token)
    if not _configured():
        message = "Google Calendar is available when OAuth credentials are configured in the backend."
    elif connected:
        message = f"Connected as {row.email}. Only events are read; nothing is written back."
    else:
        message = "Connect to bring upcoming Google events into Memoza."
    return {
        "configured": _configured(),
        "connected": connected,
        "email": row.email if connected else None,
        "message": message,
    }


def _clean_pending() -> None:
    now = time.time()
    for key, (_, created, _) in list(_pending.items()):
        if now - created > 600:
            _pending.pop(key, None)


def _parse_google_time(value: str | None, all_day: bool = False) -> datetime | None:
    if not value:
        return None
    if all_day or len(value) == 10:
        parsed = date.fromisoformat(value[:10])
        return datetime.combine(parsed, day_time.min if not all_day else day_time(23, 59))
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _access_token(db: Session, row: GoogleConnection) -> str:
    if row.expires_at and row.expires_at <= utcnow() + timedelta(minutes=1):
        refresh_token = decrypt_secret(row.refresh_token)
        if not refresh_token:
            raise HTTPException(status_code=401, detail="Google connection expired. Please connect again.")
        response = httpx.post(TOKEN_URL, data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }, timeout=20)
        if response.is_error:
            raise HTTPException(status_code=401, detail="Google connection expired. Please connect again.")
        data = response.json()
        row.access_token = encrypt_secret(data["access_token"])
        if data.get("refresh_token"):
            row.refresh_token = encrypt_secret(data["refresh_token"])
        row.expires_at = utcnow() + timedelta(seconds=int(data.get("expires_in", 3600)))
        db.commit()
    return row.access_token


@router.get("/status")
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _status(db, user)


@router.get("/connect")
def connect(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not _configured():
        raise HTTPException(status_code=400, detail="Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to connect a calendar.")
    _clean_pending()
    state = f"{user.id}.{secrets.token_urlsafe(18)}"
    verifier, challenge = _pkce()
    _pending[state] = (user.id, time.time(), verifier)
    url = AUTH_URL + "?" + urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })
    return {"url": url, "message": "Google Calendar access is read-only."}


@router.get("/callback")
def callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Google sends the browser here after consent. Redirect back to the app."""
    base = settings.frontend_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(f"{base}/calendar?google=error")
    entry = _pending.pop(state, None)
    if not entry or entry[0] != state.split(".")[0]:
        return RedirectResponse(f"{base}/calendar?google=error")
    try:
        response = httpx.post(TOKEN_URL, data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": entry[2],
        }, timeout=20)
        response.raise_for_status()
        data = response.json()
        profile = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {data['access_token']}"},
            timeout=20,
        )
        email = profile.json().get("email", "") if profile.ok else ""
        row = _connection(db, entry[0]) or GoogleConnection(id=new_id(), user_id=entry[0])
        row.email = email
        row.access_token = encrypt_secret(data["access_token"])
        refresh_token = data.get("refresh_token") or decrypt_secret(row.refresh_token)
        row.refresh_token = encrypt_secret(refresh_token)
        row.expires_at = utcnow() + timedelta(seconds=int(data.get("expires_in", 3600)))
        row.updated_at = utcnow()
        db.add(row)
        db.commit()
        return RedirectResponse(f"{base}/calendar?google=connected")
    except Exception:
        return RedirectResponse(f"{base}/calendar?google=error")


@router.post("/disconnect")
def disconnect(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = _connection(db, user.id)
    if row:
        _revoke(row)
        db.delete(row)
        db.commit()
    return {"message": "Google Calendar connection removed. Memoza events were left untouched."}


@router.post("/import")
def import_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = _connection(db, user.id)
    if not row or not row.access_token:
        raise HTTPException(status_code=400, detail="Connect Google Calendar first.")
    token = _access_token(db, row)
    now = utcnow()
    response = httpx.get(CALENDAR_URL, params={
        "timeMin": now.isoformat() + "Z",
        "timeMax": (now + timedelta(days=30)).isoformat() + "Z",
        "maxResults": 100,
        "singleEvents": "true",
        "orderBy": "startTime",
    }, headers={"Authorization": f"Bearer {token}"}, timeout=25)
    if response.is_error:
        raise HTTPException(status_code=502, detail="Google Calendar could not be read. Please connect again.")
    items = response.json().get("items", [])
    added = updated = skipped = 0
    for item in items:
        if item.get("status") == "cancelled":
            skipped += 1
            continue
        start_raw = (item.get("start") or {}).get("dateTime") or (item.get("start") or {}).get("date")
        end_raw = (item.get("end") or {}).get("dateTime") or (item.get("end") or {}).get("date")
        start_at = _parse_google_time(start_raw)
        if not start_at:
            skipped += 1
            continue
        end_at = _parse_google_time(end_raw, all_day=bool((item.get("end") or {}).get("date")))
        title = (item.get("summary") or "Google Calendar event").strip()[:240]
        existing = db.scalar(select(CalendarEvent).where(
            CalendarEvent.user_id == user.id,
            CalendarEvent.source == "google",
            CalendarEvent.title == title,
            CalendarEvent.start_at == start_at,
        ))
        if existing:
            existing.end_at = end_at
            existing.location = (item.get("location") or "")[:240]
            updated += 1
            continue
        db.add(CalendarEvent(
            id=new_id(), user_id=user.id, title=title, event_type="appointment",
            start_at=start_at, end_at=end_at, location=(item.get("location") or "")[:240],
            notes=(item.get("description") or "")[:2000], source="google", is_demo=False,
        ))
        added += 1
    db.commit()
    return {
        "added": added, "updated": updated, "skipped": skipped,
        "message": f"Brought {added} new event(s) into Memoza and refreshed {updated}. Your Google Calendar was not changed.",
    }
