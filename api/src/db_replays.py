"""Postgres-backed replay persistence using games + game_players + game_events.

A replay is one row in `games` + up-to-7 rows in `game_players` (real agents
only — hosted bots are skipped) + N rows in `game_events`. This is richer than
the single-JSON-blob approach:
  • Queryable: "all games involving agent X" is a single JOIN
  • Indexed: events are paginatable by sequence number
  • ELO history: game_players.elo_before / elo_after make ELO graphs trivial

Caller (matchmaking) must embed two extra keys in the snapshot before calling
save_replay:
  _roster          — list[str] of original session IDs by seat, in seat order
                     (real agent UUIDs or "bot:Name-xxx" for hosted bots)
  _name_to_agent_id — dict[str, str] mapping player name → original session ID

These keys are stripped before any public read path returns the snapshot.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from .db import get_admin

log = logging.getLogger(__name__)

_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


def _valid_uuid(s: str | None) -> str | None:
    """Return s if it is a well-formed UUID, else None. Filters out bot IDs."""
    return s if (s and _UUID_RE.match(s)) else None


def save_replay(snapshot: dict[str, Any]) -> None:
    """Persist a finished game across games + game_players + game_events.

    `snapshot` is the dict produced by matchmaking._run_game (same shape the
    old JSON file held), plus two private keys: _roster and _name_to_agent_id.
    """
    db = get_admin()
    game_id = snapshot["id"]

    # Original session IDs by seat — real UUID or "bot:Name-xxx" for hosted bots.
    roster: list[str] = snapshot.get("_roster", [])
    # Player-name → original session ID (built by matchmaking before save_replay).
    name_to_aid: dict[str, str] = snapshot.get("_name_to_agent_id", {})

    # 1) games row ─────────────────────────────────────────────────────────────
    db.table("games").upsert({
        "id": game_id,
        "status": "completed" if snapshot.get("winner") else "running",
        "winner": snapshot.get("winner"),
        "day_number": snapshot.get("day_number", 0),
        "game_format": "7p_standard",
        "headline": snapshot.get("headline"),
        "elo_changes": snapshot.get("elo_changes"),
    }).execute()

    # 2) game_players rows (skip hosted-bot seats — no FK entry in agents) ────
    elo_by_name: dict[str, dict[str, Any]] = {
        c["name"]: c for c in snapshot.get("elo_changes", [])
    }
    player_rows = []
    for p in snapshot.get("players", []):
        seat = p.get("seat", 0)
        original_aid = roster[seat] if seat < len(roster) else None
        if not _valid_uuid(original_aid):
            continue  # hosted bot — no row in agents table
        elo_meta = elo_by_name.get(p["name"], {})
        player_rows.append({
            "game_id": game_id,
            "agent_id": original_aid,
            "seat": seat,
            "role": p.get("role"),
            "alive": p.get("alive", True),
            "eliminated_day": p.get("eliminated_day"),
            "elo_before": elo_meta.get("elo_before", 1200),
            "elo_after": elo_meta.get("elo_after"),
        })
    if player_rows:
        db.table("game_players").upsert(player_rows).execute()

    # 3) game_events rows ──────────────────────────────────────────────────────
    # Engine emits `game_over` for terminal events; DB enum uses `system` —
    # the schema doesn't model "game ended" as its own phase.
    _phase_for_db = lambda p: "system" if p == "game_over" else p
    event_rows = []
    for ev in snapshot.get("events", []):
        event_rows.append({
            "game_id": game_id,
            "sequence": ev.get("sequence"),
            "phase": _phase_for_db(ev.get("phase")),
            "day_number": ev.get("day_number") or ev.get("day", 0),
            "actor_agent_id": _valid_uuid(name_to_aid.get(ev.get("actor"))),
            "action": ev.get("action"),
            "target_agent_id": _valid_uuid(name_to_aid.get(ev.get("target"))),
            "content": ev.get("content"),
            "public": ev.get("public", True),
        })
    if event_rows:
        db.table("game_events").insert(event_rows).execute()


def load_replay(game_id: str) -> dict[str, Any] | None:
    """Reconstruct a snapshot dict from games + game_players + game_events."""
    db = get_admin()
    g = db.table("games").select("*").eq("id", game_id).execute()
    if not g.data:
        return None
    game = g.data[0]

    players = (
        db.table("game_players")
        .select("*, agents(name, slug)")
        .eq("game_id", game_id)
        .order("seat")
        .execute()
        .data
    )
    events = (
        db.table("game_events")
        .select("*")
        .eq("game_id", game_id)
        .order("sequence")
        .execute()
        .data
    )

    return {
        "id": game["id"],
        "status": game["status"],
        "winner": game["winner"],
        "day_number": game["day_number"],
        "headline": game.get("headline"),
        "elo_changes": game.get("elo_changes") or [],
        "players": [
            {
                "agent_id": p["agent_id"],
                "seat": p["seat"],
                "role": p["role"],
                "alive": p["alive"],
                "eliminated_day": p["eliminated_day"],
                "name": (p.get("agents") or {}).get("name"),
                "slug": (p.get("agents") or {}).get("slug"),
            }
            for p in players
        ],
        "events": [
            {
                "sequence": e["sequence"],
                "phase": e["phase"],
                "day_number": e["day_number"],
                "action": e["action"],
                "content": e["content"],
                "public": e["public"],
                "actor_agent_id": e.get("actor_agent_id"),
                "target_agent_id": e.get("target_agent_id"),
            }
            for e in events
        ],
    }


def list_replays(limit: int = 50) -> list[dict[str, Any]]:
    """Recent completed games with embedded players, newest first.

    Returned shape matches the legacy in-memory snapshot dict so badge
    predicates and `role_stats_for` (which both walk `r["players"]`) work
    unchanged. The embed pulls game_players + agents in one round trip.
    """
    g = (
        get_admin()
        .table("games")
        .select("*, game_players(seat,role,alive,eliminated_day,agents(name,slug))")
        .eq("status", "completed")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows: list[dict[str, Any]] = []
    for row in g.data:
        players = []
        for gp in (row.pop("game_players", None) or []):
            agent = gp.get("agents") or {}
            players.append({
                "name": agent.get("name"),
                "slug": agent.get("slug"),
                "seat": gp.get("seat"),
                "role": gp.get("role"),
                "alive": gp.get("alive"),
                "eliminated_day": gp.get("eliminated_day"),
            })
        rows.append({**row, "players": players})
    return rows
