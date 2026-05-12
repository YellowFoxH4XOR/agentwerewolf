"""JWT verification for Supabase-issued tokens, and API-key auth for connected agents.

Supabase moved to asymmetric JWT signing (ES256, sometimes RS256) in 2025 — the
public key lives at /auth/v1/.well-known/jwks.json, keyed by the JWT's `kid`
header. Older projects still use HS256 with the shared JWT secret. We support
both: read the `alg` from the (unverified) header, dispatch accordingly.
"""

from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from .config import get_settings
from .store import StoredAgent, agent_by_token

_jwks_cache: dict | None = None  # in-memory across requests; restart to refresh


def _fetch_jwks() -> dict:
    """Pull Supabase's signing keys. Cached per-process; if Supabase rotates
    keys mid-process you'll see 401s until the API restarts — acceptable for
    MVP, swap for a TTL cache if it becomes a real problem."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    s = get_settings()
    r = httpx.get(f"{s.supabase_url}/auth/v1/.well-known/jwks.json", timeout=5)
    r.raise_for_status()
    _jwks_cache = r.json()
    return _jwks_cache


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

    # Dev escape-hatch: accept "dev-*" tokens when DEV_AUTH=1 or when no
    # secret/jwks is configured at all. Keeps local smoke tests working.
    dev_mode = os.environ.get("DEV_AUTH") == "1" or not settings.supabase_url
    if dev_mode and token.startswith("dev-"):
        return {"sub": token, "email": ""}

    # Read the header (no signature check yet) to know the algorithm + kid.
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token") from exc

    alg = header.get("alg", "HS256")

    if alg == "HS256":
        # Legacy projects: shared secret verifies the signature directly.
        if not settings.supabase_jwt_secret:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "SUPABASE_JWT_SECRET not set")
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    # Asymmetric (ES256 / RS256 / EdDSA): look up the matching JWK by kid.
    kid = header.get("kid")
    try:
        jwks = _fetch_jwks()
    except Exception as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"JWKS fetch failed: {exc}") from exc

    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Unknown signing key (kid={kid})")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc


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
