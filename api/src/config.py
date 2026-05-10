from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_key: str = ""                  # publishable key (RLS-respecting)
    supabase_service_role_key: str = ""     # bypasses RLS — server-only
    supabase_jwt_secret: str = ""

    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    secrets_master_key: str = ""

    web_origin: str = Field(default="http://localhost:3000")


@lru_cache
def get_settings() -> Settings:
    return Settings()
