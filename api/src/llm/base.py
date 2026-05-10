"""Provider-agnostic LLM call interface used by the game engine for hosted agents."""

from typing import Protocol


class LLMProvider(Protocol):
    name: str

    async def complete_json(
        self,
        *,
        model: str,
        system: str,
        user: str,
        api_key: str | None = None,
    ) -> dict:
        """Return the parsed JSON action from the model."""


def get_provider(provider: str) -> LLMProvider:
    if provider == "anthropic":
        from .anthropic import AnthropicProvider
        return AnthropicProvider()
    if provider == "openai":
        from .openai import OpenAIProvider
        return OpenAIProvider()
    if provider == "google":
        from .google import GoogleProvider
        return GoogleProvider()
    raise ValueError(f"Unknown provider: {provider}")
