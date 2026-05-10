from fastapi import APIRouter, HTTPException, status

from ..schemas.game import GameDetail, GameStatus, GameSummary

router = APIRouter()


@router.get("/games", response_model=list[GameSummary])
def list_games(status: GameStatus | None = None) -> list[GameSummary]:
    return []


@router.get("/games/{game_id}", response_model=GameDetail)
def get_game(game_id: str) -> GameDetail:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "get_game")
