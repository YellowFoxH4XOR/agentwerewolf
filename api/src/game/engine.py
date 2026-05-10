"""Werewolf state machine — pure Python, no I/O.

Caller drives the loop:
    state = new_game(roster)
    while state.winner is None:
        run_phase(state, action_provider)
"""

from __future__ import annotations

import random
from collections import Counter
from collections.abc import Callable
from dataclasses import asdict
from typing import Any
from uuid import UUID, uuid4

from .state import Event, GameState, Phase, Player, Role, Winner

STANDARD_7P_ROLES: list[Role] = [
    Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER, Role.DOCTOR,
    Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
]

# An ActionProvider returns the action a given (alive) player wants to take.
# Signature: provider(state, player, task) -> {"target": name, "speech": str, "reasoning": str}
ActionProvider = Callable[[GameState, Player, str], dict[str, Any]]


# ── Construction ────────────────────────────────────────────────────────────

def new_game(
    agents: list[tuple[str, str]],
    *,
    roles: list[Role] = STANDARD_7P_ROLES,
    seed: int | None = None,
) -> GameState:
    """`agents` is a list of (agent_id_str, name)."""
    if len(agents) != len(roles):
        raise ValueError(f"Need {len(roles)} agents, got {len(agents)}")
    rng = random.Random(seed)
    shuffled = roles[:]
    rng.shuffle(shuffled)
    state = GameState()
    for seat, ((aid, name), role) in enumerate(zip(agents, shuffled, strict=True)):
        state.players.append(
            Player(agent_id=UUID(aid) if _is_uuid(aid) else uuid4(), name=name, seat=seat, role=role)
        )
    return state


def _is_uuid(s: str) -> bool:
    try:
        UUID(s)
        return True
    except ValueError:
        return False


# ── Event helpers ───────────────────────────────────────────────────────────

def _emit(state: GameState, **kwargs: Any) -> Event:
    ev = Event(sequence=len(state.events) + 1, day_number=state.day_number, phase=state.phase, **kwargs)
    state.events.append(ev)
    return ev


# ── Phase resolution ────────────────────────────────────────────────────────

def run_phase(state: GameState, provider: ActionProvider) -> None:
    """Advance one phase, dispatching actions to the provider."""
    if state.phase == Phase.NIGHT:
        _resolve_night(state, provider)
    elif state.phase == Phase.DAY_DISCUSSION:
        _resolve_discussion(state, provider)
    elif state.phase == Phase.DAY_VOTE:
        _resolve_vote(state, provider)
    state.winner = _check_winner(state)
    if state.winner is None:
        _advance_phase(state)
    else:
        state.phase = Phase.GAME_OVER
        _emit(state, actor=None, action="system_announce",
              content=f"{state.winner.value.title()} win.")


def _advance_phase(state: GameState) -> None:
    order = [Phase.NIGHT, Phase.DAY_DISCUSSION, Phase.DAY_VOTE]
    nxt = order[(order.index(state.phase) + 1) % len(order)]
    if nxt == Phase.NIGHT:
        state.day_number += 1
    state.phase = nxt


def _resolve_night(state: GameState, provider: ActionProvider) -> None:
    """Wolf chooses a target → doctor saves → seer investigates."""
    wolves = [p for p in state.alive() if p.role == Role.WEREWOLF]
    doctor = next((p for p in state.alive() if p.role == Role.DOCTOR), None)
    seer = next((p for p in state.alive() if p.role == Role.SEER), None)

    # Wolves agree on a kill (use first wolf's choice; majority wolves vote in V2).
    kill_target_name: str | None = None
    if wolves:
        action = provider(state, wolves[0], "kill")
        kill_target_name = action.get("target")
        _emit(state, actor=wolves[0].name, action="kill",
              target=kill_target_name, content=None, public=False)

    # Doctor save
    save_target_name: str | None = None
    if doctor:
        action = provider(state, doctor, "save")
        save_target_name = action.get("target")
        _emit(state, actor=doctor.name, action="save",
              target=save_target_name, content=None, public=False)

    # Seer investigation
    if seer:
        action = provider(state, seer, "investigate")
        target_name = action.get("target")
        target = state.by_name(target_name) if target_name else None
        result = target.role.value if target else "unknown"
        _emit(state, actor=seer.name, action="investigate",
              target=target_name, content=f"reveals: {result}", public=False)

    # Resolve kill vs save
    if kill_target_name and kill_target_name != save_target_name:
        victim = state.by_name(kill_target_name)
        if victim and victim.alive:
            victim.alive = False
            victim.eliminated_day = state.day_number
            _emit(state, actor=None, action="eliminated", target=victim.name,
                  content=f"{victim.name} was killed in the night.")
    else:
        _emit(state, actor=None, action="system_announce",
              content="The village wakes — everyone survived the night.")


def _resolve_discussion(state: GameState, provider: ActionProvider) -> None:
    """Each living player gets one speech."""
    for p in state.alive():
        action = provider(state, p, "speak")
        speech = action.get("speech") or ""
        _emit(state, actor=p.name, action="speak", target=None, content=speech)


def _resolve_vote(state: GameState, provider: ActionProvider) -> None:
    tally: Counter[str] = Counter()
    for p in state.alive():
        action = provider(state, p, "vote")
        target = action.get("target")
        _emit(state, actor=p.name, action="vote", target=target, content=None)
        if target:
            tally[target] += 1

    if not tally:
        _emit(state, actor=None, action="system_announce",
              content="No votes cast — no one is eliminated.")
        return

    top, top_votes = tally.most_common(1)[0]
    tied = [name for name, v in tally.items() if v == top_votes]
    if len(tied) > 1:
        _emit(state, actor=None, action="system_announce",
              content=f"Vote tied between {', '.join(tied)} — no one is eliminated.")
        return

    victim = state.by_name(top)
    if victim and victim.alive:
        victim.alive = False
        victim.eliminated_day = state.day_number
        _emit(state, actor=None, action="eliminated", target=victim.name,
              content=f"{victim.name} was eliminated by village vote. They were a {victim.role.value}.")


def _check_winner(state: GameState) -> Winner | None:
    alive = state.alive()
    wolves = [p for p in alive if p.role == Role.WEREWOLF]
    villagers = [p for p in alive if p.role != Role.WEREWOLF]
    if not wolves:
        return Winner.VILLAGERS
    if len(wolves) >= len(villagers):
        return Winner.WEREWOLVES
    return None


# ── Serialization ───────────────────────────────────────────────────────────

def state_to_dict(state: GameState) -> dict[str, Any]:
    return {
        "id": str(state.id),
        "phase": state.phase.value,
        "day_number": state.day_number,
        "winner": state.winner.value if state.winner else None,
        "players": [
            {**asdict(p), "agent_id": str(p.agent_id), "role": p.role.value} for p in state.players
        ],
        "events": [
            {**asdict(ev), "phase": ev.phase.value} for ev in state.events
        ],
    }
