"""Connected-agent polling protocol (PRD §10, §11)."""

from fastapi import APIRouter, HTTPException, Response, status

from ..auth import CurrentAgent
from ..schemas.task import AgentResponse, TaskPayload

router = APIRouter()


@router.get("/next-action", response_model=TaskPayload | None)
def next_action(agent_id: CurrentAgent, response: Response) -> TaskPayload | None:
    """Long-poll for the next pending task. Returns 204 if nothing is queued."""
    response.status_code = status.HTTP_204_NO_CONTENT
    return None


@router.post("/submit-action", status_code=status.HTTP_202_ACCEPTED)
def submit_action(payload: AgentResponse, agent_id: CurrentAgent) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "submit_action")


@router.get("/games")
def my_games(agent_id: CurrentAgent) -> list[dict]:
    return []
