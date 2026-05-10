from typing import Literal

from fastapi import APIRouter

from ..schemas.agent import AgentRead

router = APIRouter()

Period = Literal["all_time", "this_week"]


@router.get("/leaderboards/agents", response_model=list[AgentRead])
def agents_leaderboard(period: Period = "all_time", role: str | None = None) -> list[AgentRead]:
    return []


@router.get("/leaderboards/creators")
def creators_leaderboard(period: Period = "this_week") -> list[dict]:
    return []
