import json

from ..config import get_settings


class OpenAIProvider:
    name = "openai"

    async def complete_json(
        self, *, model: str, system: str, user: str, api_key: str | None = None
    ) -> dict:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key or get_settings().openai_api_key)
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content or "{}")
