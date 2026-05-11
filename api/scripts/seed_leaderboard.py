"""Seed the leaderboard with N synthetic games (PRD §14 cold-start mitigation).

    cd api && uv run python scripts/seed_leaderboard.py [--games 30]

Creates 20 agents owned by curated personas, queues them in groups of 7,
runs games to completion, and lets the engine update ELO + write replays +
fire badges. Idempotent — re-running adds more games on top of the existing
leaderboard.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import sys
import uuid
from pathlib import Path

# Ensure src/ is importable when run from api/
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db import get_admin
from src.matchmaking import GAME_SIZE, get_matchmaking
from src.store import agents_for, create_agent, get_agent, set_plan

SEED_PERSONAS = [
    ("nyx",         ["ShadowFox", "Phantom"]),
    ("verity",      ["TruthSeeker", "Oracle"]),
    ("datamind",    ["LogicBot", "BrainWave"]),
    ("guardian_ai", ["LifeGuard", "Sentinel"]),
    ("wolfpack",    ["MoonHowler", "IronClad"]),
    ("chaos_agent", ["Wildcard", "Vortex"]),
    ("stormchaser", ["SilentStorm", "Strategist"]),
    ("aisensei",    ["NeuralNinja"]),
    ("ghostcoder",  ["Spectre"]),
    ("fortress_ai", ["Blitz"]),
    ("adapt_ai",    ["Chameleon"]),
    ("px_labs",     ["PixelMind"]),
]

# Stable namespace so re-runs produce the same UUIDs (idempotent seeding).
_SEED_NS = uuid.UUID("c0ffee00-0000-4000-8000-000000000001")


def _persona_uuid(name: str) -> str:
    return str(uuid.uuid5(_SEED_NS, f"agentwerewolf-seed:{name}"))


def _ensure_user(username: str) -> str:
    """Insert (or find) a public.users row with the persona as `username`.
    Returns the user's UUID. Bypasses the auth-trigger path since seed users
    don't exist in auth.users — migration 0002 dropped the FK that previously
    blocked this."""
    user_id = _persona_uuid(username)
    db = get_admin()
    existing = db.table("users").select("id").eq("id", user_id).execute()
    if not existing.data:
        db.table("users").insert({
            "id": user_id,
            "username": username,
            "email": f"{username}@seed.local",
        }).execute()
    return user_id


def ensure_seed_agents() -> list[str]:
    """Make sure 20 seed agents exist. Returns the list of agent IDs."""
    agent_ids: list[str] = []
    for username, names in SEED_PERSONAS:
        user_id = _ensure_user(username)
        # Bypass per-plan agent cap so each persona can hold all its seed agents.
        set_plan(user_id, "builder")
        existing = {a.name for a in agents_for(user_id)}
        for name in names:
            if name in existing:
                aid = next(a.id for a in agents_for(user_id) if a.name == name)
                agent_ids.append(aid)
                continue
            agent, _ = create_agent(owner_id=user_id, name=name)
            agent_ids.append(agent.id)
    return agent_ids


async def run_games(num_games: int, agent_ids: list[str]) -> None:
    mm = get_matchmaking()
    rng = random.Random()

    for game_num in range(num_games):
        roster = rng.sample(agent_ids, GAME_SIZE)
        # Queue all 7 — matchmaker auto-starts when GAME_SIZE reached
        for aid in roster:
            agent = get_agent(aid)
            if agent is None:
                continue
            await mm.join(agent.id, agent.name, is_bot=True)
        # Wait for the game just queued to finish
        # (it's the most recent in the registry)
        for _ in range(120):  # up to ~2 min
            await asyncio.sleep(1)
            running = [g for g in mm.list_games() if g["status"] == "running"]
            if not running:
                break
        latest = mm.list_games()[0] if mm.list_games() else None
        print(f"[{game_num + 1}/{num_games}] {latest['id']} → winner={latest['winner']}" if latest else "no game tracked")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--games", type=int, default=10, help="number of games to play")
    args = p.parse_args()

    print("Ensuring 20 seed agents…")
    agent_ids = ensure_seed_agents()
    print(f"Have {len(agent_ids)} seed agents.")

    if len(agent_ids) < GAME_SIZE:
        print("Need at least 7 seed agents to start games.")
        sys.exit(1)

    print(f"Playing {args.games} games to seed leaderboard / replays…")
    asyncio.run(run_games(args.games, agent_ids))
    print("\nDone. Leaderboard, replays, badges all populated.")


if __name__ == "__main__":
    main()
