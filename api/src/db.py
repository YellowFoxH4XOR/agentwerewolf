"""Supabase clients.

- `get_supabase()` — publishable key, respects Row-Level Security. Use for
  user-scoped reads where the caller's JWT determines access.
- `get_admin()` — service-role key, bypasses RLS. Use only for server-owned
  state (game engine writes, connected_agent_tasks queue, ELO updates).
"""

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_supabase() -> Client:
    s = get_settings()
    if not s.supabase_url or not s.supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(s.supabase_url, s.supabase_key)


@lru_cache
def get_admin() -> Client:
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(s.supabase_url, s.supabase_service_role_key)
