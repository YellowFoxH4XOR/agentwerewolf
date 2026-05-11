"""In-memory matchmaking + game runtime.

Capabilities:
  • Connected agents call POST /agents/me/join → enter a queue
  • If the queue doesn't fill in `FILL_AFTER_SECONDS`, hosted bot seats fill it
  • A coroutine drives each game through the engine
  • Spectators subscribe to per-game event streams (SSE)
  • Game registry exposes live games for the lobby
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import asdict, dataclass, field
from typing import Any
from uuid import UUID, uuid4

from .badges import evaluate_for_game
from .game.elo import update as elo_update
from .game.engine import new_game, run_phase, state_to_dict
from .game.state import Event, GameState, Phase, Player, Role
from .llm.decide import deterministic_decide, llm_decide
from .replays import headline, save_replay
from .store import get_agent

GAME_SIZE = 7
FILL_AFTER_SECONDS = 8.0  # auto-fill with hosted bots after this many seconds idle

# Hosted-bot roster — distinct personalities so games feel different each round.
HOSTED_BOTS: list[tuple[str, str]] = [
    ("Phantom",      "Calm and patient. Speaks rarely but with weight when it does."),
    ("NeuralNinja",  "Precise and strategic. Cites observations like a chess player."),
    ("IronClad",     "Stubborn and direct. Will publicly commit to a vote and not back down."),
    ("Strategist",   "Long-term thinker. Always trying to predict the next two moves."),
    ("Chameleon",    "Adapts to the room. Mirrors the prevailing accusation to blend in."),
    ("BrainWave",    "Probabilistic. Talks in odds and Bayesian updates."),
    ("Sentinel",     "Defensive and protective. Quick to defend the accused without evidence."),
    ("Vortex",       "Aggressive accuser. Loud, fast, and confident — even when wrong."),
    ("Oracle",       "Cryptic and theatrical. Drops vague hints as if seeing the future."),
    ("Blitz",        "Impulsive. Votes early and loud, regrets nothing."),
]
HOSTED_BOT_NAMES = [n for n, _ in HOSTED_BOTS]
HOSTED_BOT_PERSONALITIES = dict(HOSTED_BOTS)

log = logging.getLogger(__name__)


# ── Per-task / per-session bookkeeping ────────────────────────────────────

@dataclass
class _PendingTask:
    task_id: UUID
    payload: dict[str, Any]
    response_future: asyncio.Future[dict[str, Any]] = field(
        default_factory=lambda: asyncio.get_event_loop().create_future()
    )


@dataclass
class _AgentSession:
    agent_id: str        # "bot:Phantom" for hosted bots
    name: str
    is_bot: bool
    pending: asyncio.Queue[_PendingTask | None] = field(default_factory=asyncio.Queue)
    in_game: bool = False
    current_game_id: str | None = None


# ── Live game registry ────────────────────────────────────────────────────

@dataclass
class _LiveGame:
    id: str
    started_at: float
    state: GameState                              # latest state snapshot
    roster: list[str]                             # agent_ids
    bot_count: int
    spectators: int = 0
    subscribers: list[asyncio.Queue[dict]] = field(default_factory=list)
    task: asyncio.Task | None = None
    winner: str | None = None

    def summary(self) -> dict[str, Any]:
        snap = state_to_dict(self.state)
        alive = sum(1 for p in snap["players"] if p["alive"])
        return {
            "id": self.id,
            "status": "completed" if self.winner else "running",
            "phase": snap["phase"],
            "day": snap["day_number"],
            "alive": alive,
            "spectators": self.spectators,
            "winner": self.winner,
            "agents": [p["name"] for p in snap["players"]],
            "started_at": self.started_at,
        }


# ── The matchmaker ────────────────────────────────────────────────────────

class Matchmaking:
    def __init__(self) -> None:
        self._sessions: dict[str, _AgentSession] = {}
        self._queue: list[str] = []
        self._lock = asyncio.Lock()
        self._open_tasks: dict[UUID, _PendingTask] = {}
        self._games: dict[str, _LiveGame] = {}
        self._fill_task: asyncio.Task | None = None
        self._rng = random.Random()

    # ── Public API ────────────────────────────────────────────────────

    def queue_status(self) -> dict[str, Any]:
        return {
            "queued": len(self._queue),
            "needed": GAME_SIZE,
            "fill_in_seconds": FILL_AFTER_SECONDS,
            "queued_names": [self._sessions[aid].name for aid in self._queue],
            "running_games": sum(1 for g in self._games.values() if g.winner is None),
        }

    def list_games(self) -> list[dict[str, Any]]:
        return sorted(
            (g.summary() for g in self._games.values()),
            key=lambda g: (g["status"] != "running", -g["started_at"]),
        )

    def get_game(self, game_id: str) -> _LiveGame | None:
        return self._games.get(game_id)

    async def join(self, agent_id: str, name: str, is_bot: bool = False) -> None:
        async with self._lock:
            sess = self._sessions.get(agent_id)
            if sess is None:
                sess = _AgentSession(agent_id=agent_id, name=name, is_bot=is_bot)
                self._sessions[agent_id] = sess
            if sess.in_game or agent_id in self._queue:
                return
            self._queue.append(agent_id)
            await self._maybe_start_game()
            self._schedule_fill()

    async def next_action(self, agent_id: str, timeout: float = 25.0) -> dict[str, Any] | None:
        sess = self._sessions.get(agent_id)
        if sess is None:
            return None
        try:
            task = await asyncio.wait_for(sess.pending.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None
        if task is None:
            sess.in_game = False
            sess.current_game_id = None
            return {"game_over": True, "winner": None}
        return {"task_id": str(task.task_id), **task.payload}

    async def submit_action(self, agent_id: str, task_id: UUID, action: dict[str, Any]) -> None:
        task = self._open_tasks.pop(task_id, None)
        if task is None or task.response_future.done():
            return
        task.response_future.set_result(action)

    # ── Spectator stream ──────────────────────────────────────────────

    async def subscribe(self, game_id: str) -> asyncio.Queue[dict] | None:
        game = self._games.get(game_id)
        if game is None:
            return None
        q: asyncio.Queue[dict] = asyncio.Queue(maxsize=200)
        game.subscribers.append(q)
        game.spectators += 1
        # Replay current state so a fresh subscriber catches up
        await q.put({"type": "snapshot", "data": state_to_dict(game.state)})
        return q

    def unsubscribe(self, game_id: str, q: asyncio.Queue[dict]) -> None:
        game = self._games.get(game_id)
        if game and q in game.subscribers:
            game.subscribers.remove(q)
            game.spectators = max(0, game.spectators - 1)

    # ── Internals ────────────────────────────────────────────────────

    def _schedule_fill(self) -> None:
        if self._fill_task is None or self._fill_task.done():
            self._fill_task = asyncio.create_task(self._fill_with_bots_later())

    async def _fill_with_bots_later(self) -> None:
        await asyncio.sleep(FILL_AFTER_SECONDS)
        async with self._lock:
            need = GAME_SIZE - len(self._queue)
            if need <= 0 or not self._queue:
                return
            chosen = self._rng.sample(HOSTED_BOT_NAMES, k=min(need, len(HOSTED_BOT_NAMES)))
            for n in chosen:
                bot_id = f"bot:{n}-{uuid4().hex[:6]}"
                self._sessions[bot_id] = _AgentSession(agent_id=bot_id, name=n, is_bot=True)
                self._queue.append(bot_id)
            await self._maybe_start_game()

    async def _maybe_start_game(self) -> None:
        if len(self._queue) < GAME_SIZE:
            return
        roster = self._queue[:GAME_SIZE]
        self._queue = self._queue[GAME_SIZE:]
        for aid in roster:
            self._sessions[aid].in_game = True
        game_id = str(uuid4())
        agents = [(aid, self._sessions[aid].name) for aid in roster]
        state = new_game(agents)
        bot_count = sum(1 for aid in roster if self._sessions[aid].is_bot)
        live = _LiveGame(id=game_id, started_at=time.time(), state=state,
                         roster=roster, bot_count=bot_count)
        self._games[game_id] = live
        for aid in roster:
            self._sessions[aid].current_game_id = game_id
        live.task = asyncio.create_task(self._run_game(live))
        log.info("game started: %s (bots=%d/%d)", game_id, bot_count, GAME_SIZE)

    async def _run_game(self, live: _LiveGame) -> None:
        state = live.state
        loop = asyncio.get_event_loop()
        rng = random.Random()

        async def provider_async(s: GameState, player: Player, task_name: str) -> dict[str, Any]:
            sess_id = live.roster[player.seat]
            sess = self._sessions[sess_id]

            if sess.is_bot:
                # Hosted bot — call LLM if a key is configured, else deterministic.
                # Brief jitter so the spectator stream paces nicely.
                await asyncio.sleep(0.4 + rng.random() * 0.4)
                return await llm_decide(
                    s, player, task_name,
                    personality=HOSTED_BOT_PERSONALITIES.get(sess.name),
                    rng=rng,
                )

            # Connected agent — issue task, wait for submit-action.
            payload = self._make_payload(s, player, task_name, live.id)
            pending = _PendingTask(task_id=uuid4(), payload=payload)
            self._open_tasks[pending.task_id] = pending
            await sess.pending.put(pending)
            try:
                return await asyncio.wait_for(pending.response_future, timeout=60)
            except asyncio.TimeoutError:
                self._open_tasks.pop(pending.task_id, None)
                return {"action": task_name, "target": None, "speech": "(timed out)", "reasoning": "timeout"}

        def sync_provider(s: GameState, p: Player, t: str) -> dict[str, Any]:
            fut = asyncio.run_coroutine_threadsafe(provider_async(s, p, t), loop)
            return fut.result()

        try:
            event_cursor = 0
            while state.winner is None and state.phase != Phase.GAME_OVER:
                await asyncio.to_thread(run_phase, state, sync_provider)
                # Fan out new events to spectators
                new_events = state.events[event_cursor:]
                event_cursor = len(state.events)
                for ev in new_events:
                    if ev.public:
                        await self._broadcast(live, {"type": "event", "data": _event_dict(ev)})
                await self._broadcast(live, {
                    "type": "phase_change",
                    "data": {"phase": state.phase.value, "day": state.day_number},
                })

            live.winner = state.winner.value if state.winner else None

            # Apply ELO updates for stored (non-bot) agents
            elo_changes = self._apply_elo(live, state)

            # Persist the finished game so it survives restarts.
            full_state = state_to_dict(state)
            snap = {
                **full_state,           # players, events, day_number
                **live.summary(),        # overrides id/status/winner with matchmaking values
                "elo_changes": elo_changes,
            }
            snap["headline"] = headline(snap)
            # Provide original session IDs so db_replays can skip bot seats (no
            # FK row in agents) and resolve actor/target names to real agent UUIDs.
            snap["_roster"] = live.roster
            snap["_name_to_agent_id"] = {
                self._sessions[aid].name: aid for aid in live.roster
            }
            save_replay(snap)

            # Evaluate badges for all users with agents in this game.
            new_badges = evaluate_for_game([p.name for p in state.players])

            await self._broadcast(live, {
                "type": "game_over",
                "data": {
                    "winner": live.winner,
                    "elo_changes": elo_changes,
                    "headline": snap["headline"],
                    "new_badges": new_badges,
                },
            })

            # Release all seats so they can join the next game.
            for aid in live.roster:
                sess = self._sessions[aid]
                sess.in_game = False
                sess.current_game_id = None
                if not sess.is_bot:
                    await sess.pending.put(None)

            # Keep the game in registry for replay; mark non-running.
        except Exception:
            log.exception("Game %s crashed", live.id)

    def _apply_elo(self, live: _LiveGame, state: GameState) -> list[dict[str, Any]]:
        """Update ELO for stored agents. Returns per-agent change records."""
        from .store import get_agent as get_stored_agent, update_elo

        if state.winner is None:
            return []

        # Collect (agent_id, current_elo, won?) per seat.
        # Bots whose ID maps to a real stored agent (e.g. seeded leaderboard
        # agents) still get ELO updates — only synthetic "bot:Phantom-xxx"
        # ephemeral seats are skipped.
        per_seat = []
        for seat, sess_id in enumerate(live.roster):
            sess = self._sessions[sess_id]
            stored = get_stored_agent(sess_id)  # None for ephemeral hosted bots
            cur_elo = stored.elo if stored else 1200
            won = (state.players[seat].role == Role.WEREWOLF) == (state.winner.value == "werewolves")
            per_seat.append((seat, sess_id, sess, stored, cur_elo, won))

        # Average opponent ELO per seat (the opposite team's avg).
        wolf_elos = [e for (_, _, _, _, e, _), p in zip(per_seat, state.players) if p.role == Role.WEREWOLF]
        vill_elos = [e for (_, _, _, _, e, _), p in zip(per_seat, state.players) if p.role != Role.WEREWOLF]
        wolf_avg = sum(wolf_elos) / len(wolf_elos) if wolf_elos else 1200
        vill_avg = sum(vill_elos) / len(vill_elos) if vill_elos else 1200

        changes = []
        for seat, sess_id, sess, stored, cur_elo, won in per_seat:
            opp_avg = wolf_avg if state.players[seat].role != Role.WEREWOLF else vill_avg
            new = elo_update(cur_elo, round(opp_avg), 1.0 if won else 0.0)
            change = {
                "name": sess.name,
                "elo_before": cur_elo,
                "elo_after": new,
                "delta": new - cur_elo,
                "won": won,
            }
            changes.append(change)
            if stored is not None:  # only persist for real users' agents
                update_elo(sess_id, new, won)
        return changes

    async def _broadcast(self, live: _LiveGame, message: dict) -> None:
        dead = []
        for q in live.subscribers:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            live.subscribers.remove(q)
            live.spectators = max(0, live.spectators - 1)

    def _make_payload(self, state: GameState, player: Player, task_name: str, game_id: str) -> dict[str, Any]:
        snap = state_to_dict(state)
        return {
            "game_id": game_id,
            "phase": snap["phase"],
            "day_number": snap["day_number"],
            "your_role": player.role.value,
            "your_name": player.name,
            "alive_players": [p["name"] for p in snap["players"] if p["alive"]],
            "dead_players": [
                {"name": p["name"], "role": p["role"], "day": p["eliminated_day"]}
                for p in snap["players"] if not p["alive"]
            ],
            "private_info": self._private_info(state, player),
            "public_history": [
                _event_dict(ev) for ev in state.events
                if ev.public and ev.action in ("speak", "vote", "eliminated", "system_announce")
            ],
            "task": task_name,
            "deadline_seconds": 60,
        }

    def _private_info(self, state: GameState, player: Player) -> dict[str, Any]:
        info: dict[str, Any] = {}
        if player.role == Role.WEREWOLF:
            info["fellow_wolves"] = [p.name for p in state.players if p.role == Role.WEREWOLF and p.name != player.name]
        if player.role == Role.SEER:
            info["past_investigations"] = [
                {"target": ev.target, "result": ev.content}
                for ev in state.events if ev.actor == player.name and ev.action == "investigate"
            ]
        if player.role == Role.DOCTOR:
            saves = [ev.target for ev in state.events if ev.actor == player.name and ev.action == "save"]
            info["last_save"] = saves[-1] if saves else None
        return info


def _event_dict(ev: Event) -> dict[str, Any]:
    return {
        "sequence": ev.sequence,
        "phase": ev.phase.value,
        "day": ev.day_number,
        "actor": ev.actor,
        "action": ev.action,
        "target": ev.target,
        "content": ev.content,
    }


_singleton: Matchmaking | None = None


def get_matchmaking() -> Matchmaking:
    global _singleton
    if _singleton is None:
        _singleton = Matchmaking()
    return _singleton
