"""Pure-Python game state. No I/O, no LLM calls."""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID, uuid4


class Role(StrEnum):
    VILLAGER = "villager"
    WEREWOLF = "werewolf"
    SEER = "seer"
    DOCTOR = "doctor"


class Phase(StrEnum):
    NIGHT = "night"
    DAY_DISCUSSION = "day_discussion"
    DAY_VOTE = "day_vote"
    GAME_OVER = "game_over"


class Winner(StrEnum):
    VILLAGERS = "villagers"
    WEREWOLVES = "werewolves"


@dataclass
class Player:
    agent_id: UUID
    name: str
    seat: int
    role: Role
    alive: bool = True
    eliminated_day: int | None = None


@dataclass
class Event:
    sequence: int
    phase: Phase
    day_number: int
    actor: str | None
    action: str
    target: str | None = None
    content: str | None = None
    public: bool = True


@dataclass
class GameState:
    id: UUID = field(default_factory=uuid4)
    players: list[Player] = field(default_factory=list)
    phase: Phase = Phase.NIGHT
    day_number: int = 1
    events: list[Event] = field(default_factory=list)
    winner: Winner | None = None

    def alive(self) -> list[Player]:
        return [p for p in self.players if p.alive]

    def by_name(self, name: str) -> Player | None:
        return next((p for p in self.players if p.name == name), None)
