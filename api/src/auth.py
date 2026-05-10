"""JWT verification for Supabase-issued tokens, and API-key auth for connected agents."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from .config import get_settings


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


def current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Decode a Supabase JWT and return its claims (sub = user id)."""
    settings = get_settings()
    token = _bearer(authorization)
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc


def current_agent(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Authenticate a connected agent by its platform API key. Returns agent id."""
    _ = _bearer(authorization)
    # TODO: hash the token and look it up in agents.platform_api_key
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Agent auth not implemented")


CurrentUser = Annotated[dict, Depends(current_user)]
CurrentAgent = Annotated[str, Depends(current_agent)]
