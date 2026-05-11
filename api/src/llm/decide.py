"""LLM-driven decision for hosted bots.

Caller passes a snapshot of the game state from the bot's perspective, plus
the task. We prompt the LLM, parse its JSON response, and return the action.

Falls back to a deterministic policy if no provider is configured or the
LLM call fails — games stay playable without API keys.
"""

from __future__ import annotations

import json
import logging
import random
from typing import Any

from ..config import get_settings
from ..game.state import GameState, Player, Role
from .base import get_provider

log = logging.getLogger(__name__)


# ── Deterministic baseline (also exposed for tests / offline play) ────────

def deterministic_decide(rng: random.Random, state: GameState, player: Player, task: str) -> dict[str, Any]:
    alive = [p for p in state.alive() if p.name != player.name]
    if not alive:
        return {"target": None, "speech": "", "reasoning": ""}
    if task == "kill":
        target = rng.choice([p for p in alive if p.role != Role.WEREWOLF] or alive)
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
            Role.SEER:     "I sense something off about one of us.",
            Role.DOCTOR:   "I'd rather not draw attention.",
            Role.VILLAGER: "Let's look at the voting patterns from yesterday.",
        }[player.role]
        return {"target": None, "speech": line, "reasoning": "rhetoric"}
    return {"target": None, "speech": "", "reasoning": ""}


# ── LLM-driven path ──────────────────────────────────────────────────────

ROLE_HINTS = {
    Role.VILLAGER: "You have no special powers. Use logic and observation.",
    Role.WEREWOLF: "You know your fellow wolf. Deceive the village. Don't out yourself.",
    Role.SEER:     "Each night you may investigate one player and learn their role. Drop hints carefully.",
    Role.DOCTOR:   "Each night you may protect one player from the wolves (you may protect yourself).",
}


def _build_prompt(state: GameState, player: Player, task: str, personality: str | None) -> tuple[str, str]:
    others_alive = [p for p in state.alive() if p.name != player.name]

    private = []
    if player.role == Role.WEREWOLF:
        wolves = [p.name for p in state.players if p.role == Role.WEREWOLF and p.name != player.name]
        private.append(f"Fellow werewolves: {wolves}")
    if player.role == Role.SEER:
        invest = [(ev.target, ev.content) for ev in state.events
                  if ev.actor == player.name and ev.action == "investigate"]
        if invest:
            private.append(f"Past investigations: {invest}")
    if player.role == Role.DOCTOR:
        saves = [ev.target for ev in state.events if ev.actor == player.name and ev.action == "save"]
        if saves:
            private.append(f"Last save: {saves[-1]}")

    public_history = [
        {"day": ev.day_number, "phase": ev.phase.value, "actor": ev.actor,
         "action": ev.action, "target": ev.target, "content": ev.content}
        for ev in state.events
        if ev.public and ev.action in ("speak", "vote", "eliminated", "system_announce")
    ]

    system = f"""You are {player.name}, an AI agent playing 7-player Werewolf.
Your role: {player.role.value}. {ROLE_HINTS[player.role]}
Personality: {personality or 'neutral, observant.'}

Respond ONLY with valid JSON: {{"reasoning": "...", "action": "...", "target": "...", "speech": "..."}}
"""

    user = f"""Game state — Day {state.day_number}, phase {state.phase.value}.
Alive players: {[p.name for p in state.alive()]}
Other living players you can target: {[p.name for p in others_alive]}
Private info: {private or 'none'}
Public history (most recent last):
{json.dumps(public_history[-30:], indent=2)}

Your task: **{task}**.
"""
    return system, user


async def llm_decide(
    state: GameState,
    player: Player,
    task: str,
    *,
    personality: str | None = None,
    rng: random.Random | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    rng = rng or random.Random()

    # Pick the first provider with a key set.
    provider_name: str | None = None
    model: str | None = None
    if settings.anthropic_api_key:
        provider_name, model = "anthropic", "claude-haiku-4-5"
    elif settings.openai_api_key:
        provider_name, model = "openai", "gpt-5-mini"
    elif settings.google_api_key:
        provider_name, model = "google", "gemini-flash"

    if provider_name is None:
        return deterministic_decide(rng, state, player, task)

    system, user = _build_prompt(state, player, task, personality)
    try:
        provider = get_provider(provider_name)
        result = await provider.complete_json(model=model, system=system, user=user)
    except Exception as exc:
        log.warning("LLM call failed (%s); falling back to deterministic: %s", provider_name, exc)
        return deterministic_decide(rng, state, player, task)

    # Validate target (must be a living player; null-correct for vote/save/investigate).
    target = result.get("target")
    living = {p.name for p in state.alive()}
    if target and target not in living:
        target = rng.choice(list(living - {player.name})) if living - {player.name} else None
    return {
        "action": result.get("action", task),
        "target": target,
        "speech": result.get("speech"),
        "reasoning": result.get("reasoning", ""),
    }
