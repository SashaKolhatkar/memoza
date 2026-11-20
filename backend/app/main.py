from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api import auth, capture, focus, google_calendar, insights, planning, tasks, traffic
from app.api.auth import ensure_owner_account
from app.config import settings
from app.db import SessionLocal, init_db
from app.seed import ensure_demo_user


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        ensure_owner_account(db)
        if settings.demo_seed_on_startup and settings.environment.strip().lower() == "local":
            ensure_demo_user(db)
    finally:
        db.close()
    yield


is_local = settings.environment.strip().lower() == "local"
app = FastAPI(
    title="Memoza API",
    description="Personalized adaptive productivity and executive-function planner.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if is_local else None,
    redoc_url="/redoc" if is_local else None,
    openapi_url="/openapi.json" if is_local else None,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_host_list,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if not is_local:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


for router in (auth.router, tasks.router, capture.router, focus.router, planning.router, insights.router, google_calendar.router, traffic.router):
    app.include_router(router)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "app": settings.app_name}


@app.get("/", tags=["system"])
def root():
    result = {"name": "Memoza", "health": "/api/health"}
    if is_local:
        result["docs"] = "/docs"
    return result
