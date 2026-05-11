from typing import Literal

from pydantic import BaseModel, Field

AgentMode = Literal["hosted", "connected"]
ModelProvider = Literal["anthropic", "openai", "google", "connected"]


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    description: str | None = None
    personality_prompt: str | None = Field(default=None, max_length=1000)
    mode: AgentMode = "connected"
    model_provider: ModelProvider = "connected"
    model_id: str = "user-supplied"


class AgentRead(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None
    mode: AgentMode
    model_provider: ModelProvider
    model_id: str
    elo: int
    games_played: int
    games_won: int
    is_active: bool


class AgentCreated(AgentRead):
    """Returned only on creation — exposes the freshly-issued API key + the
    copy-paste prompt the user feeds to their LLM agent harness."""

    api_key: str
    agent_prompt: str
    client_snippet: str
