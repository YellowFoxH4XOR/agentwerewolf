import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse

from ..auth import CurrentUser
from ..game.engine import state_to_dict
from ..matchmaking import get_matchmaking
from ..replays import list_replays, load_replay
from ..store import get_or_create_user

router = APIRouter()


@router.get("/queue")
def queue_status() -> dict:
    """Public matchmaking status — what's queued, how many needed, when bots fill."""
    return get_matchmaking().queue_status()


@router.get("/games")
def list_games(status: str | None = None) -> list[dict]:
    mm = get_matchmaking()
    live = mm.list_games()
    live_ids = {g["id"] for g in live}
    persisted = [
        {
            "id": r["id"],
            "status": "completed",
            "phase": "game_over",
            "day": r.get("day_number", 0),
            "alive": sum(1 for p in r.get("players", []) if p.get("alive")),
            "spectators": 0,
            "winner": r.get("winner"),
            "agents": [p["name"] for p in r.get("players", [])],
            "started_at": r.get("started_at", 0),
            "headline": r.get("headline"),
        }
        for r in list_replays() if r["id"] not in live_ids
    ]
    games = live + persisted
    if status:
        games = [g for g in games if g["status"] == status]
    return games


@router.get("/games/{game_id}")
def get_game(game_id: str) -> dict:
    mm = get_matchmaking()
    live = mm.get_game(game_id)
    if live is not None:
        snap = state_to_dict(live.state)
        return {
            **live.summary(),
            "players": snap["players"],
            "events": [
                ev for ev in snap["events"]
                if ev.get("public", True)
                and ev["action"] in ("speak", "vote", "eliminated", "system_announce")
            ],
        }
    persisted = load_replay(game_id)
    if persisted is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    return persisted


@router.get("/games/{game_id}/export")
def export_replay(game_id: str, user: CurrentUser) -> Response:
    """Download the full replay as JSON. Builder-tier only (PRD §12)."""
    u = get_or_create_user(user["sub"])
    if u.plan != "builder":
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Replay export requires the Builder plan. Upgrade at /pricing.",
        )
    persisted = load_replay(game_id)
    if persisted is None:
        # Live game — snapshot it now
        live = get_matchmaking().get_game(game_id)
        if live is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
        persisted = {**state_to_dict(live.state), **live.summary()}
    body = json.dumps(persisted, indent=2)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{game_id}.json"'},
    )


@router.get("/games/{game_id}/stream")
async def stream(game_id: str, request: Request) -> StreamingResponse:
    """Server-Sent Events: live games stream events; finished games stream the snapshot once."""
    mm = get_matchmaking()
    queue = await mm.subscribe(game_id)

    if queue is None:
        # Maybe it's a persisted replay — emit a single snapshot then close.
        persisted = load_replay(game_id)
        if persisted is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")

        async def replay_gen() -> AsyncGenerator[str, None]:
            yield f"data: {json.dumps({'type': 'snapshot', 'data': persisted})}\n\n"
            yield f"data: {json.dumps({'type': 'game_over', 'data': {'winner': persisted.get('winner')}})}\n\n"

        return StreamingResponse(replay_gen(), media_type="text/event-stream")

    async def gen() -> AsyncGenerator[str, None]:
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(msg)}\n\n"
                    if msg.get("type") == "game_over":
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            mm.unsubscribe(game_id, queue)

    return StreamingResponse(gen(), media_type="text/event-stream")
