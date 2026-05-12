"""Postgres-backed store. Mirrors the public surface of store.py.

Switch over by changing imports from `.store` → `.db_store` once migration
0002 is applied. The dataclasses (StoredAgent, StoredUser) stay identical so
nothing else in the codebase needs to change.

Why Supabase service-role:
  All writes here are server-controlled (user upgrades plan, agent earns ELO,
  badge awarded). The service role bypasses RLS, which is exactly what we want
  — RLS protects browser/anon-key access; server code with full trust uses
  service role.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from .db import get_admin
from .replays import list_replays

log = logging.getLogger(__name__)

def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def mint_api_key() -> tuple[str, str]:
    raw = "aw_live_" + secrets.token_urlsafe(28)
    return raw, _hash(raw)


def slugify(name: str) -> str:
    import re
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "agent"


# Same shape as store.StoredAgent so call-sites don't change.
@dataclass
class StoredAgent:
    id: str
    owner_id: str
    name: str
    slug: str
    description: str | None
    api_key_hash: str
    elo: int = 1200
    games_played: int = 0
    games_won: int = 0


@dataclass
class StoredUser:
    id: str


# ── Row mapping ────────────────────────────────────────────────────────────
# Schema columns `plan`, `stripe_customer_id`, `credits_balance` still exist
# but are vestigial — no code reads or writes them now that payments are gone.

def _agent_from_row(row: dict[str, Any]) -> StoredAgent:
    return StoredAgent(
        id=row["id"],
        owner_id=row["owner_id"],
        name=row["name"],
        slug=row["slug"],
        description=row.get("description"),
        api_key_hash=row.get("platform_api_key") or "",
        elo=row.get("elo", 1200),
        games_played=row.get("games_played", 0),
        games_won=row.get("games_won", 0),
    )


def _user_from_row(row: dict[str, Any]) -> StoredUser:
    return StoredUser(id=row["id"])


# ── Users ──────────────────────────────────────────────────────────────────

def get_or_create_user(user_id: str) -> StoredUser:
    """Idempotent: returns existing row or creates one. In production the
    on_auth_user_created trigger handles real signups; this covers dev tokens
    and service-side creations."""
    db = get_admin()
    existing = db.table("users").select("*").eq("id", user_id).execute()
    if existing.data:
        return _user_from_row(existing.data[0])

    short = user_id[:8] if len(user_id) >= 8 else user_id
    insert = {
        "id": user_id,
        "username": f"user_{short}",
        "email": f"{short}@dev.local",
    }
    try:
        db.table("users").insert(insert).execute()
    except Exception as exc:
        # username collision possible — retry with a uuid suffix
        if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
            insert["username"] = f"user_{short}_{uuid4().hex[:4]}"
            db.table("users").insert(insert).execute()
        else:
            raise
    return StoredUser(id=user_id)


# ── Agents ─────────────────────────────────────────────────────────────────

def create_agent(owner_id: str, name: str, description: str | None = None) -> tuple[StoredAgent, str]:
    get_or_create_user(owner_id)
    db = get_admin()

    raw, h = mint_api_key()
    base_slug = slugify(name)
    slug = base_slug
    n = 1
    # Find a unique slug — small race window is fine for our scale.
    while db.table("agents").select("slug").eq("slug", slug).execute().data:
        n += 1
        slug = f"{base_slug}-{n}"

    row = {
        "id": str(uuid4()),
        "owner_id": owner_id,
        "name": name,
        "slug": slug,
        "description": description,
        "personality_prompt": None,
        "mode": "connected",
        "model_provider": "connected",
        "model_id": "user-supplied",
        "platform_api_key": h,
        "elo": 1200,
        "games_played": 0,
        "games_won": 0,
        "is_active": True,
    }
    db.table("agents").insert(row).execute()
    return _agent_from_row(row), raw


def agent_by_token(raw_token: str) -> StoredAgent | None:
    h = _hash(raw_token)
    r = get_admin().table("agents").select("*").eq("platform_api_key", h).execute()
    return _agent_from_row(r.data[0]) if r.data else None


def agent_by_slug(slug: str) -> StoredAgent | None:
    r = get_admin().table("agents").select("*").eq("slug", slug).execute()
    return _agent_from_row(r.data[0]) if r.data else None


def get_agent(agent_id: str) -> StoredAgent | None:
    # Ephemeral hosted-bot session IDs (e.g. "bot:IronClad-13dc1f") aren't
    # UUIDs and have no row in the agents table — short-circuit here rather
    # than letting Postgres 400 on the uuid cast.
    try:
        UUID(agent_id)
    except (ValueError, TypeError, AttributeError):
        return None
    r = get_admin().table("agents").select("*").eq("id", agent_id).execute()
    return _agent_from_row(r.data[0]) if r.data else None


def update_elo(agent_id: str, new_elo: int, won: bool) -> None:
    db = get_admin()
    a = get_agent(agent_id)
    if a is None:
        return
    patch = {
        "elo": new_elo,
        "games_played": a.games_played + 1,
        "games_won": a.games_won + (1 if won else 0),
    }
    db.table("agents").update(patch).eq("id", agent_id).execute()


def all_agents() -> list[StoredAgent]:
    r = get_admin().table("agents").select("*").eq("is_active", True).order("elo", desc=True).execute()
    return [_agent_from_row(row) for row in r.data]


def agents_for(user_id: str) -> list[StoredAgent]:
    r = get_admin().table("agents").select("*").eq("owner_id", user_id).eq("is_active", True).execute()
    return [_agent_from_row(row) for row in r.data]


def count_agents(user_id: str) -> int:
    r = get_admin().table("agents").select("id", count="exact").eq("owner_id", user_id).eq("is_active", True).execute()
    return r.count or 0


def delete_agent(slug: str) -> bool:
    a = agent_by_slug(slug)
    if a is None:
        return False
    # Soft delete to keep replay history valid. Hard delete on cascade would
    # nuke game_players + game_events rows referencing this agent — bad UX.
    get_admin().table("agents").update({"is_active": False}).eq("slug", slug).execute()
    return True


def rotate_key(slug: str) -> str | None:
    a = agent_by_slug(slug)
    if a is None:
        return None
    raw, h = mint_api_key()
    get_admin().table("agents").update({"platform_api_key": h}).eq("slug", slug).execute()
    return raw


# ── Cross-table aggregates ─────────────────────────────────────────────────

def role_stats_for(agent_name: str) -> dict[str, dict[str, int]]:
    """Per-role play/win totals from replays. Replays still come from
    list_replays() until we swap that module too — but the read path will
    move to game_players/game_events tables in the next iteration."""
    out: dict[str, dict[str, int]] = {
        r: {"played": 0, "won": 0} for r in ("villager", "werewolf", "seer", "doctor")
    }
    for r in list_replays():
        winner = r.get("winner")
        for p in r.get("players", []):
            if p.get("name") != agent_name:
                continue
            role = p.get("role")
            if role not in out:
                continue
            out[role]["played"] += 1
            won = (role == "werewolf") == (winner == "werewolves")
            if won:
                out[role]["won"] += 1
    return out
