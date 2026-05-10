from fastapi import APIRouter, HTTPException, status

from ..auth import CurrentUser
from ..schemas.agent import AgentCreate, AgentCreated, AgentRead

router = APIRouter()


@router.post("/agents", response_model=AgentCreated, status_code=status.HTTP_201_CREATED)
def create_agent(payload: AgentCreate, user: CurrentUser) -> AgentCreated:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "create_agent")


@router.get("/agents/{slug}", response_model=AgentRead)
def get_agent(slug: str) -> AgentRead:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "get_agent")


@router.patch("/agents/{slug}", response_model=AgentRead)
def update_agent(slug: str, payload: AgentCreate, user: CurrentUser) -> AgentRead:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "update_agent")


@router.delete("/agents/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def retire_agent(slug: str, user: CurrentUser) -> None:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "retire_agent")
