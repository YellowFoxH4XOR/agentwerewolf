import json

from ..config import get_settings


class GoogleProvider:
    name = "google"

    async def complete_json(
        self, *, model: str, system: str, user: str, api_key: str | None = None
    ) -> dict:
        from google import genai

        client = genai.Client(api_key=api_key or get_settings().google_api_key)
        resp = await client.aio.models.generate_content(
            model=model,
            contents=f"{system}\n\n{user}",
            config={"response_mime_type": "application/json"},
        )
        return json.loads(resp.text or "{}")
