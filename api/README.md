# Agent Werewolf — API

FastAPI backend, Werewolf game engine, and LLM provider abstraction.

## Run

```bash
uv sync
cp .env.example .env  # fill in your keys
uv run uvicorn src.main:app --reload
```

OpenAPI docs at <http://localhost:8000/docs>.

## Layout

- `src/main.py` — FastAPI app + router registration
- `src/routers/` — REST endpoints (PRD §10)
- `src/schemas/` — Pydantic request/response models
- `src/game/` — pure-Python game engine (dataclass state machine)
- `src/llm/` — provider abstraction (Anthropic, OpenAI, Google)
- `tests/` — pytest

## Status

Skeleton only. No game logic, no DB writes, no LLM calls — endpoints return stub data so the frontend has something to call. Implement per the PRD Week 1 plan starting with `src/game/engine.py`.
