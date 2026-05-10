"""Runnable demo: plays a full 7-agent game with a deterministic fake action provider.

    uv run python -m src.game.demo
"""

from __future__ import annotations

import random
from typing import Any
from uuid import uuid4

from .engine import new_game, run_phase, state_to_dict
from .state import GameState, Phase, Player, Role


def fake_provider(rng: random.Random):
    """Deterministic stand-in for an LLM. Wolves target villagers; villagers vote randomly."""

    def provider(state: GameState, player: Player, task: str) -> dict[str, Any]:
        alive = [p for p in state.alive() if p.name != player.name]
        if not alive:
            return {"target": None, "speech": "", "reasoning": ""}

        if task == "kill":
            non_wolves = [p for p in alive if p.role != Role.WEREWOLF]
            target = rng.choice(non_wolves or alive)
            return {"target": target.name, "speech": None, "reasoning": "hunt"}

        if task == "save":
            return {"target": rng.choice(alive + [player]).name, "speech": None, "reasoning": "guard"}

        if task == "investigate":
            return {"target": rng.choice(alive).name, "speech": None, "reasoning": "scan"}

        if task == "vote":
            return {"target": rng.choice(alive).name, "speech": None, "reasoning": "hunch"}

        if task == "speak":
            line = {
                Role.WEREWOLF: "I'm just trying to figure this out like everyone else.",
                Role.SEER: "I sense something off about one of us.",
                Role.DOCTOR: "I'd rather not draw attention.",
                Role.VILLAGER: "Let's look at the voting patterns from yesterday.",
            }[player.role]
            return {"target": None, "speech": line, "reasoning": "rhetoric"}

        return {"target": None, "speech": "", "reasoning": ""}

    return provider


def main(seed: int = 7) -> None:
    rng = random.Random(seed)
    roster = [
        (str(uuid4()), name)
        for name in ["ShadowFox", "MoonHowler", "TruthSeeker", "LifeGuard",
                     "LogicBot", "Wildcard", "SilentStorm"]
    ]
    state = new_game(roster, seed=seed)
    provider = fake_provider(rng)

    print(f"Game {state.id}\n" + "─" * 60)
    for p in state.players:
        print(f"  Seat {p.seat}: {p.name:<14} {p.role.value}")
    print("─" * 60)

    while state.winner is None and state.phase != Phase.GAME_OVER:
        prev = state.phase
        run_phase(state, provider)
        for ev in state.events[-12:]:
            actor = ev.actor or "—"
            tgt = f" → {ev.target}" if ev.target else ""
            content = f"  «{ev.content}»" if ev.content else ""
            print(f"  d{ev.day_number}/{prev.value:<14} {actor:<14} {ev.action}{tgt}{content}")
        if state.phase != prev:
            print(f"  ── {state.phase.value} (day {state.day_number}) ──")

    print(f"\n🏁 Winner: {state.winner.value if state.winner else 'none'}")
    print(f"   Total events: {len(state.events)}")
    print(f"   Survivors: {[p.name for p in state.alive()]}")


if __name__ == "__main__":
    main()
