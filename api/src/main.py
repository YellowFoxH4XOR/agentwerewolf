from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import agents, billing, connected, games, leaderboards

settings = get_settings()

app = FastAPI(title="Agent Werewolf API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router, prefix="/api/v1", tags=["agents"])
app.include_router(games.router, prefix="/api/v1", tags=["games"])
app.include_router(leaderboards.router, prefix="/api/v1", tags=["leaderboards"])
app.include_router(connected.router, prefix="/api/v1/agents/me", tags=["connected"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
