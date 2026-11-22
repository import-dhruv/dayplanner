import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = "dayplanner-local-secret-key-change-me-please-1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL or os.getenv("POSTGRES_URL") or os.getenv("DATABASE_PUBLIC_URL") or ""
        if not url:
            url = "postgresql+psycopg2://planner@127.0.0.1:55433/dayplanner"
        # SQLAlchemy 2.x defaults to psycopg (v3); psycopg2 is what we ship.
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg2://" + url[len("postgresql://") :]
        return url


settings = Settings()
