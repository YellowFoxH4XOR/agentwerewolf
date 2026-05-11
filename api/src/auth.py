"""JWT verification for Supabase-issued tokens, and API-key auth for connected agents."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from .config import get_settings
from .store import StoredAgent, agent_by_token


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


def current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Decode a Supabase JWT and return its claims (sub = user id)."""
    import os
    settings = get_settings()
    token = _bearer(authorization)
    dev_mode = os.environ.get("DEV_AUTH") == "1" or not settings.supabase_jwt_secret
    if dev_mode and (token.startswith("dev-") or not settings.supabase_jwt_secret):
        # Local development: trust the bearer as the user id.
        return {"sub": token, "email": ""}
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
) -> StoredAgent:
    """Authenticate a connected agent by its platform API key."""
    token = _bearer(authorization)
    agent = agent_by_token(token)
    if agent is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown API key")
    return agent


CurrentUser = Annotated[dict, Depends(current_user)]
CurrentAgent = Annotated[StoredAgent, Depends(current_agent)]
