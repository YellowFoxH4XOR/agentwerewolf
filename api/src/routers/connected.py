"""Connected-agent polling protocol (PRD §10, §11)."""

import time
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel

from ..auth import CurrentAgent
from ..matchmaking import get_matchmaking

router = APIRouter()

# Per-agent token-bucket rate limiter for /next-action.
# 1 call per 250ms is generous (any sane agent waits at least a few hundred ms
# between polls); abusive agents get 429s instead of melting the server.
_MIN_INTERVAL = 0.25
_last_poll: dict[str, float] = defaultdict(float)


class JoinResponse(BaseModel):
    queued: bool


class SubmitBody(BaseModel):
    task_id: str
    action: str
    target: str | None = None
    speech: str | None = None
    reasoning: str = ""


@router.post("/join", response_model=JoinResponse, status_code=status.HTTP_202_ACCEPTED)
async def join(agent: CurrentAgent) -> JoinResponse:
    mm = get_matchmaking()
    await mm.join(agent.id, agent.name)
    return JoinResponse(queued=True)


@router.get("/test-connection")
def test_connection(agent: CurrentAgent) -> dict:
    """Sanity check for users wiring up their agent harness. Returns a synthetic
    task payload — same shape they'll see in real games — so they can verify
    parsing without entering matchmaking.
    """
    from uuid import uuid4
    return {
        "ok": True,
        "agent_name": agent.name,
        "agent_slug": agent.slug,
        "elo": agent.elo,
        "sample_task": {
            "task_id": str(uuid4()),
            "game_id": "test-game",
            "phase": "day_discussion",
            "day_number": 1,
            "your_role": "villager",
            "your_name": agent.name,
            "alive_players": [agent.name, "Phantom", "Vortex", "Oracle", "Blitz", "IronClad", "Sentinel"],
            "dead_players": [],
            "private_info": {},
            "public_history": [
                {"day": 1, "phase": "system", "actor": None, "action": "system_announce",
                 "target": None, "content": "The village wakes — everyone survived the night."}
            ],
            "task": "speak",
            "deadline_seconds": 60,
        },
        "expected_response_shape": {
            "task_id": "<echo from sample_task>",
            "action": "speak | vote | kill | save | investigate",
            "target": "<player_name | null>",
            "speech": "<your statement | null>",
            "reasoning": "<private chain-of-thought>",
        },
    }


@router.get("/next-action")
async def next_action(agent: CurrentAgent, response: Response):
    now = time.monotonic()
    elapsed = now - _last_poll[agent.id]
    if elapsed < _MIN_INTERVAL:
        retry_in = _MIN_INTERVAL - elapsed
        response.headers["Retry-After"] = f"{retry_in:.2f}"
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Poll at most once every {_MIN_INTERVAL * 1000:.0f}ms (retry in {retry_in * 1000:.0f}ms)",
        )
    _last_poll[agent.id] = now

    mm = get_matchmaking()
    task = await mm.next_action(agent.id, timeout=25)
    if task is None:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    return task


@router.post("/submit-action", status_code=status.HTTP_202_ACCEPTED)
async def submit_action(payload: SubmitBody, agent: CurrentAgent) -> dict[str, str]:
    try:
        tid = UUID(payload.task_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "task_id must be a UUID") from exc
    mm = get_matchmaking()
    await mm.submit_action(
        agent.id,
        tid,
        {
            "action": payload.action,
            "target": payload.target,
            "speech": payload.speech,
            "reasoning": payload.reasoning,
        },
    )
    return {"status": "accepted"}


@router.get("/games")
def my_games(agent: CurrentAgent) -> list[dict]:
    return []
