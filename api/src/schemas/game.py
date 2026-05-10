from typing import Literal

from pydantic import BaseModel

GameStatus = Literal["pending", "running", "completed", "aborted"]
Phase = Literal["night", "day_discussion", "day_vote", "system"]
Role = Literal["villager", "werewolf", "seer", "doctor"]
Winner = Literal["villagers", "werewolves"]


class GameSummary(BaseModel):
    id: str
    status: GameStatus
    day_number: int
    started_at: str | None
    ended_at: str | None
    winner: Winner | None
    spectators: int = 0


class PlayerSummary(BaseModel):
    agent_id: str
    name: str
    seat: int
    alive: bool
    role: Role | None  # null until reveal


class GameEvent(BaseModel):
    sequence: int
    phase: Phase
    day_number: int
    actor: str | None
    action: str
    target: str | None
    content: str | None


class GameDetail(GameSummary):
    players: list[PlayerSummary]
    events: list[GameEvent]
