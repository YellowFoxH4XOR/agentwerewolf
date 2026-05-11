"""Postgres-backed badge persistence. Mirrors badges.py public API.

Swap by changing the persistence calls inside `badges.evaluate_for_user` from
the in-memory `_store` to these functions.

The badge *definitions* (the `ALL_BADGES` list) stay in `badges.py` — only the
"has user earned this?" state moves to Postgres.
"""

from __future__ import annotations

import logging
from typing import Any

from .db import get_admin

log = logging.getLogger(__name__)


def get_earned_ids(user_id: str) -> set[str]:
    """Returns the set of badge IDs this user has already earned."""
    r = get_admin().table("user_badges").select("badge_id").eq("user_id", user_id).execute()
    return {row["badge_id"] for row in r.data}


def award(user_id: str, badge_id: str) -> bool:
    """Insert a single badge. Idempotent — duplicate insert is a no-op via
    the (user_id, badge_id) primary key. Returns True if newly awarded."""
    try:
        get_admin().table("user_badges").insert({
            "user_id": user_id,
            "badge_id": badge_id,
        }).execute()
        return True
    except Exception as exc:
        msg = str(exc).lower()
        if "duplicate" in msg or "primary key" in msg or "conflict" in msg:
            return False
        log.exception("Failed to award badge %s to %s", badge_id, user_id)
        raise


def all_earned_for_users(user_ids: list[str]) -> dict[str, set[str]]:
    """Bulk-fetch earned badge IDs for many users at once. Used by the
    leaderboard page when rendering N profile cards."""
    if not user_ids:
        return {}
    r = (
        get_admin()
        .table("user_badges")
        .select("user_id,badge_id")
        .in_("user_id", user_ids)
        .execute()
    )
    out: dict[str, set[str]] = {uid: set() for uid in user_ids}
    for row in r.data:
        out.setdefault(row["user_id"], set()).add(row["badge_id"])
    return out
