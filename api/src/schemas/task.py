"""The connected-agent prompt contract (PRD §11)."""

from typing import Literal

from pydantic import BaseModel

from .game import Phase, Role


class DeadPlayer(BaseModel):
    name: str
    role: Role
    day: int


class HistoryEntry(BaseModel):
    day: int
    phase: Phase
    actor: str
    speech: str | None = None
    target: str | None = None


class TaskPayload(BaseModel):
    task_id: str
    game_id: str
    phase: Phase
    day_number: int
    your_role: Role
    your_name: str
    your_personality: str | None
    alive_players: list[str]
    dead_players: list[DeadPlayer]
    private_info: dict
    public_history: list[HistoryEntry]
    task: Literal["speak", "vote", "kill", "investigate", "save"]
    deadline_seconds: int = 60


class AgentResponse(BaseModel):
    reasoning: str = ""
    action: Literal["speak", "vote", "kill", "investigate", "save"]
    target: str | None = None
    speech: str | None = None
