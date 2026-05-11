from fastapi import APIRouter, HTTPException, status

from ..agent_prompt import python_client, system_prompt
from ..auth import CurrentUser
from ..matchmaking import get_matchmaking
from ..schemas.agent import AgentCreate, AgentCreated, AgentRead
from ..store import (
    agent_by_slug, agents_for, count_agents, create_agent,
    delete_agent, get_or_create_user, rotate_key,
)

router = APIRouter()

# Soft cap to deter spam-agents; nothing payment-related, no upgrade path.
MAX_AGENTS_PER_USER = 10


@router.post("/agents", response_model=AgentCreated, status_code=status.HTTP_201_CREATED)
def create(payload: AgentCreate, user: CurrentUser) -> AgentCreated:
    get_or_create_user(user["sub"])
    used = count_agents(user["sub"])
    if used >= MAX_AGENTS_PER_USER:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"You already have {used} agents — the per-user limit is {MAX_AGENTS_PER_USER}.",
        )
    agent, raw_key = create_agent(
        owner_id=user["sub"], name=payload.name, description=payload.description
    )
    return AgentCreated(
        id=agent.id,
        slug=agent.slug,
        name=agent.name,
        description=agent.description,
        mode=payload.mode,
        model_provider=payload.model_provider,
        model_id=payload.model_id,
        elo=agent.elo,
        games_played=agent.games_played,
        games_won=agent.games_won,
        is_active=True,
        api_key=raw_key,
        agent_prompt=system_prompt(api_key=raw_key, agent_name=agent.name),
        client_snippet=python_client(api_key=raw_key, agent_name=agent.name),
    )


@router.get("/agents/mine", response_model=list[AgentRead])
def list_mine(user: CurrentUser) -> list[AgentRead]:
    return [
        AgentRead(
            id=a.id, slug=a.slug, name=a.name, description=a.description,
            mode="connected", model_provider="connected", model_id="user-supplied",
            elo=a.elo, games_played=a.games_played, games_won=a.games_won, is_active=True,
        )
        for a in agents_for(user["sub"])
    ]


@router.delete("/agents/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def retire(slug: str, user: CurrentUser) -> None:
    a = agent_by_slug(slug)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    if a.owner_id != user["sub"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your agent")
    delete_agent(slug)


@router.post("/agents/{slug}/queue", status_code=status.HTTP_202_ACCEPTED)
async def queue(slug: str, user: CurrentUser) -> dict:
    """Owner-only: enter matchmaking with this agent. Avoids exposing the API key
    in the browser when the user just wants to queue from the UI."""
    a = agent_by_slug(slug)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    if a.owner_id != user["sub"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your agent")
    await get_matchmaking().join(a.id, a.name)
    return {"queued": True, "agent": a.name}


@router.post("/agents/{slug}/rotate-key")
def rotate(slug: str, user: CurrentUser) -> dict:
    a = agent_by_slug(slug)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    if a.owner_id != user["sub"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your agent")
    raw = rotate_key(slug)
    return {
        "api_key": raw,
        "agent_prompt": system_prompt(api_key=raw, agent_name=a.name),
        "client_snippet": python_client(api_key=raw, agent_name=a.name),
    }


@router.get("/agents/{slug}/role-stats")
def role_stats(slug: str) -> dict:
    a = agent_by_slug(slug)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    from ..store import role_stats_for
    raw = role_stats_for(a.name)
    return {
        role: {**counts, "win_rate": (counts["won"] / counts["played"]) if counts["played"] else 0.0}
        for role, counts in raw.items()
    }


@router.get("/agents/{slug}", response_model=AgentRead)
def get(slug: str) -> AgentRead:
    agent = agent_by_slug(slug)
    if agent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    return AgentRead(
        id=agent.id,
        slug=agent.slug,
        name=agent.name,
        description=agent.description,
        mode="connected",
        model_provider="connected",
        model_id="user-supplied",
        elo=agent.elo,
        games_played=agent.games_played,
        games_won=agent.games_won,
        is_active=True,
    )
