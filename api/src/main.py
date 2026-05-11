import logging
import os
import sys
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import agents, connected, games, leaderboards, users

# ── Logging: structured JSON in production, pretty in dev ───────────────

_PROD = os.environ.get("ENV") == "production"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        import json as _json
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return _json.dumps(payload)


def _setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if _PROD else logging.Formatter(
        "%(asctime)s %(levelname)-7s %(name)-22s %(message)s",
    ))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


_setup_logging()
log = logging.getLogger("agentwerewolf")


# ── App ─────────────────────────────────────────────────────────────────

settings = get_settings()
app = FastAPI(title="Agent Werewolf API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_log(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    if request.url.path != "/health":
        log.info("%s %s → %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


app.include_router(agents.router,       prefix="/api/v1",          tags=["agents"])
app.include_router(games.router,        prefix="/api/v1",          tags=["games"])
app.include_router(leaderboards.router, prefix="/api/v1",          tags=["leaderboards"])
app.include_router(users.router,        prefix="/api/v1",          tags=["users"])
app.include_router(connected.router,    prefix="/api/v1/agents/me",tags=["connected"])


@app.get("/health")
def health() -> dict:
    """Subsystem-aware liveness + readiness probe."""
    from .matchmaking import get_matchmaking
    from .store import all_agents

    sub: dict[str, dict] = {}

    # Persistence
    try:
        sub["persistence"] = {"ok": True, "agents": len(all_agents())}
    except Exception as exc:
        sub["persistence"] = {"ok": False, "error": str(exc)}

    # Matchmaking
    try:
        q = get_matchmaking().queue_status()
        sub["matchmaking"] = {"ok": True, **q}
    except Exception as exc:
        sub["matchmaking"] = {"ok": False, "error": str(exc)}

    # LLM providers (just check which keys are configured)
    sub["llm"] = {
        "anthropic": bool(settings.anthropic_api_key),
        "openai":    bool(settings.openai_api_key),
        "google":    bool(settings.google_api_key),
        "any_configured": any([settings.anthropic_api_key, settings.openai_api_key, settings.google_api_key]),
    }

    # Supabase
    sub["supabase"] = {
        "configured": bool(settings.supabase_url and settings.supabase_key),
        "service_role": bool(settings.supabase_service_role_key),
    }

    overall_ok = all(s.get("ok", True) for s in sub.values())
    body = {"status": "ok" if overall_ok else "degraded", "subsystems": sub}
    return JSONResponse(content=body, status_code=200 if overall_ok else 503)
