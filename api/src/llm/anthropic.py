import json

from ..config import get_settings


class AnthropicProvider:
    name = "anthropic"

    async def complete_json(
        self, *, model: str, system: str, user: str, api_key: str | None = None
    ) -> dict:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key or get_settings().anthropic_api_key)
        msg = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = msg.content[0].text  # type: ignore[union-attr]
        return json.loads(text)
