import os
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application configuration. All values can be set through environment variables."""

    app_name: str = "Memoza"
    environment: str = "local"
    secret_key: str = "memoza-local-development-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 12 * 60
    database_url: str = f"sqlite:///{BASE_DIR / 'dayflow.db'}"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:4173"
    allowed_hosts: str = "127.0.0.1,localhost,testserver"
    demo_seed_on_startup: bool = True
    model_path: str = str(BASE_DIR / "duration_model.joblib")
    # Optional read-only Google Calendar import. Set all three values in .env
    # (or as environment variables) to show the connection in the Calendar page.
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://127.0.0.1:8010/api/google/callback"
    frontend_url: str = "http://127.0.0.1:5174"
    # The account with this email is the only one allowed to see site traffic.
    owner_email: str = "sashakolhatkar28@gmail.com"
    # Required to register that reserved email as the owner account.
    owner_setup_token: str = ""
    # Change this in deployment so stored visitor tokens cannot be reversed.
    traffic_salt: str = "memoza-local-traffic-salt-change-in-production"
    traffic_retention_days: int = 180

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        # Render supplies postgres://... URLs; SQLAlchemy 2.x needs an explicit driver.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @model_validator(mode="after")
    def validate_deployment_settings(self):
        if "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS cannot be '*' while credentialed requests are enabled.")
        if "*" in self.allowed_host_list:
            raise ValueError("ALLOWED_HOSTS cannot be '*'.")
        if self.environment.strip().lower() != "local":
            if self.secret_key == "memoza-local-development-secret-change-in-production" or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be a long random value outside local development.")
            if self.traffic_salt == "memoza-local-traffic-salt-change-in-production" or len(self.traffic_salt) < 16:
                raise ValueError("TRAFFIC_SALT must be a long random value outside local development.")
            if not self.owner_setup_token or len(self.owner_setup_token) < 16:
                raise ValueError("OWNER_SETUP_TOKEN must be set outside local development.")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_host_list(self) -> list[str]:
        hosts = [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]
        # Render exposes its own public hostname here; allow it without a wildcard.
        render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
        if render_host and render_host not in hosts:
            hosts.append(render_host)
        return hosts


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
