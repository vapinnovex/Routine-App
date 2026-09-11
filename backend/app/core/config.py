from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_database: str = "routine"
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]
    session_days: int = Field(default=30, ge=1, le=90)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    @model_validator(mode="after")
    def validate_cookie_settings(self):
        if "*" in self.cors_origins:
            raise ValueError("Credentialed CORS requires explicit origins")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None requires COOKIE_SECURE=true")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
