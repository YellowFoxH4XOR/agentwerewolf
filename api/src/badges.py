"""Achievement / badge system.

Each badge has a `check(user, agents, replays)` predicate. After every game
ends, `evaluate_for_user(user_id)` runs all checks and persists newly-earned
badges via Postgres (db_badges). Frontend reads them via /api/v1/users/{username}/badges.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from . import db_badges
from .replays import list_replays
from .store import StoredAgent, agents_for, get_or_create_user

log = logging.getLogger(__name__)


@dataclass
class Badge:
    id: str
    label: str
    icon: str
    description: str
    check: Callable[[str, list[StoredAgent], list[dict[str, Any]]], bool]


def _user_replays(user_agent_names: set[str], replays: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Replays involving any of the user's agents."""
    return [r for r in replays if any(p["name"] in user_agent_names for p in r.get("players", []))]


def _wins_for(user_agent_names: set[str], replays: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for r in replays:
        for p in r.get("players", []):
            if p["name"] not in user_agent_names:
                continue
            won = (p["role"] == "werewolf") == (r.get("winner") == "werewolves")
            if won:
                out.append(r)
                break
    return out


# ── Badge definitions (PRD §13 lists 10) ────────────────────────────────────

ALL_BADGES: list[Badge] = [
    Badge(
        id="first_blood", label="First Win", icon="🥇",
        description="Win your first game.",
        check=lambda uid, agents, replays: len(_wins_for({a.name for a in agents}, replays)) >= 1,
    ),
    Badge(
        id="ten_wins", label="10 Wins", icon="💪",
        description="Win 10 games across all your agents.",
        check=lambda uid, agents, replays: len(_wins_for({a.name for a in agents}, replays)) >= 10,
    ),
    Badge(
        id="century", label="100 Games", icon="💯",
        description="Play 100 games across all your agents.",
        check=lambda uid, agents, replays: len(_user_replays({a.name for a in agents}, replays)) >= 100,
    ),
    Badge(
        id="master_deceiver", label="Master of Deception", icon="🎭",
        description="Win 5 games as a werewolf.",
        check=lambda uid, agents, replays: sum(
            1 for r in replays
            for p in r.get("players", [])
            if p["name"] in {a.name for a in agents}
            and p["role"] == "werewolf"
            and r.get("winner") == "werewolves"
        ) >= 5,
    ),
    Badge(
        id="seer_savant", label="Seer Savant", icon="🔮",
        description="Win 3 games as the seer.",
        check=lambda uid, agents, replays: sum(
            1 for r in replays
            for p in r.get("players", [])
            if p["name"] in {a.name for a in agents}
            and p["role"] == "seer"
            and r.get("winner") == "villagers"
        ) >= 3,
    ),
    Badge(
        id="lifesaver", label="Lifesaver", icon="💊",
        description="Win 3 games as the doctor.",
        check=lambda uid, agents, replays: sum(
            1 for r in replays
            for p in r.get("players", [])
            if p["name"] in {a.name for a in agents}
            and p["role"] == "doctor"
            and r.get("winner") == "villagers"
        ) >= 3,
    ),
    Badge(
        id="village_pillar", label="Village Pillar", icon="🏘️",
        description="Win 5 games as a villager.",
        check=lambda uid, agents, replays: sum(
            1 for r in replays
            for p in r.get("players", [])
            if p["name"] in {a.name for a in agents}
            and p["role"] == "villager"
            and r.get("winner") == "villagers"
        ) >= 5,
    ),
    Badge(
        id="lone_wolf", label="Lone Wolf", icon="🐺",
        description="Win a game as the last werewolf standing.",
        check=lambda uid, agents, replays: any(
            r.get("winner") == "werewolves"
            and len([p for p in r.get("players", []) if p["role"] == "werewolf" and p["alive"]]) == 1
            and any(p["name"] in {a.name for a in agents} and p["role"] == "werewolf" and p["alive"] for p in r.get("players", []))
            for r in replays
        ),
    ),
    Badge(
        id="kingmaker", label="Kingmaker", icon="👑",
        description="Reach 1500 ELO with any agent.",
        check=lambda uid, agents, replays: any(a.elo >= 1500 for a in agents),
    ),
    Badge(
        id="prolific", label="Prolific Builder", icon="🛠",
        description="Create 5 different agents.",
        check=lambda uid, agents, replays: len(agents) >= 5,
    ),
]

ALL_BADGES_BY_ID = {b.id: b for b in ALL_BADGES}


# ── Public API ──────────────────────────────────────────────────────────────

def evaluate_for_user(user_id: str) -> list[Badge]:
    """Run all badge checks for the user; return newly-earned badges."""
    get_or_create_user(user_id)
    agents = agents_for(user_id)
    replays = list_replays()
    earned = db_badges.get_earned_ids(user_id)

    newly = []
    for b in ALL_BADGES:
        if b.id in earned:
            continue
        try:
            if b.check(user_id, agents, replays):
                db_badges.award(user_id, b.id)
                newly.append(b)
        except Exception:
            log.exception("Badge check failed: %s", b.id)
    return newly


def evaluate_for_game(player_names: list[str]) -> dict[str, list[str]]:
    """After a game ends, run checks for every distinct user with an agent in
    that game. Returns {user_id: [newly_earned_badge_ids]}."""
    from .store import all_agents
    player_set = set(player_names)
    user_ids = {a.owner_id for a in all_agents() if a.name in player_set}
    out = {}
    for uid in user_ids:
        new = evaluate_for_user(uid)
        if new:
            out[uid] = [b.id for b in new]
            log.info("user %s earned: %s", uid, [b.label for b in new])
    return out


def badges_for(user_id: str) -> list[dict[str, Any]]:
    earned = db_badges.get_earned_ids(user_id)
    return [
        {
            "id": b.id, "label": b.label, "icon": b.icon, "description": b.description,
            "earned": b.id in earned,
        }
        for b in ALL_BADGES
    ]
