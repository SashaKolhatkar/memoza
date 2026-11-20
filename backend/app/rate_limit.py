"""Small in-process rate limiter for sensitive endpoints.

This is a baseline defence for single-process deployments. Put a real limiter
in front of the app (reverse proxy / gateway) for multi-worker production.
"""

import threading
import time

from fastapi import HTTPException, Request, status

_LOCK = threading.Lock()
_HITS: dict[tuple[str, str], list[float]] = {}


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, scope: str, limit: int, window_seconds: int) -> None:
    key = (scope, client_key(request))
    now = time.monotonic()
    cutoff = now - window_seconds
    with _LOCK:
        hits = [stamp for stamp in _HITS.get(key, []) if stamp > cutoff]
        if len(hits) >= limit:
            _HITS[key] = hits
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again in a moment.",
            )
        hits.append(now)
        _HITS[key] = hits
        if len(_HITS) > 10000:
            for old_key, old_hits in list(_HITS.items()):
                if not any(stamp > cutoff for stamp in old_hits):
                    _HITS.pop(old_key, None)
