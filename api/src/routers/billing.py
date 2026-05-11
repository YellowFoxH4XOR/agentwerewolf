"""Stripe checkout + webhook + plan-tier helpers (PRD §12).

Both endpoints work without a Stripe key — they return helpful 503s — so the
rest of the app stays runnable in dev.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel

from ..auth import CurrentUser
from ..config import get_settings
from ..store import PLAN_LIMITS, get_or_create_user, set_plan

router = APIRouter()
log = logging.getLogger(__name__)


class CheckoutRequest(BaseModel):
    plan: str  # "pro" | "builder"


class CheckoutResponse(BaseModel):
    url: str


@router.get("/plans")
def list_plans() -> dict:
    return {
        "tiers": [
            {"id": "free",    "name": "Free",    "price_usd": 0,  "max_agents": PLAN_LIMITS["free"]["max_agents"],
             "features": ["3 active agents", "3 hosted games/week (Haiku)", "Unlimited connected games"]},
            {"id": "pro",     "name": "Pro",     "price_usd": 9,  "max_agents": PLAN_LIMITS["pro"]["max_agents"],
             "features": ["10 active agents", "50 hosted games/week (any model)", "Private lobbies", "Pro badge"]},
            {"id": "builder", "name": "Builder", "price_usd": 29, "max_agents": "unlimited",
             "features": ["Unlimited agents", "Unlimited hosted games", "Priority queue (sub-2s polling)",
                          "API access", "Replay export", "Builder badge"]},
        ],
        "credits": [
            {"price_usd": 5,  "credits": 25},
            {"price_usd": 20, "credits": 120},
            {"price_usd": 50, "credits": 350},
        ],
    }


@router.get("/me")
def my_plan(user: CurrentUser) -> dict:
    u = get_or_create_user(user["sub"])
    limits = PLAN_LIMITS[u.plan]
    from ..store import count_agents
    return {
        "plan": u.plan,
        "label": limits["label"],
        "max_agents": limits["max_agents"],
        "agents_used": count_agents(u.id),
        "credits_balance": u.credits_balance,
    }


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(payload: CheckoutRequest, user: CurrentUser) -> CheckoutResponse:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Stripe not configured. Set STRIPE_SECRET_KEY + STRIPE_PRICE_PRO + STRIPE_PRICE_BUILDER in .env.",
        )

    price_id = {
        "pro":     settings.stripe_price_pro,
        "builder": settings.stripe_price_builder,
    }.get(payload.plan)
    if not price_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown plan: {payload.plan}")

    import stripe
    stripe.api_key = settings.stripe_secret_key

    u = get_or_create_user(user["sub"])
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.web_origin}/account?upgrade=success",
        cancel_url=f"{settings.web_origin}/pricing?upgrade=cancelled",
        client_reference_id=u.id,
        customer=u.stripe_customer_id or None,
        metadata={"plan": payload.plan, "user_id": u.id},
    )
    return CheckoutResponse(url=session.url)


@router.post("/webhook", include_in_schema=False)
async def webhook(request: Request, stripe_signature: str = Header(default="")) -> dict:
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe webhook not configured")

    import stripe
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Bad webhook: {exc}") from exc

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
        plan = obj.get("metadata", {}).get("plan", "pro")
        customer_id = obj.get("customer")
        if user_id:
            set_plan(user_id, plan, stripe_customer_id=customer_id)
            log.info("Upgraded %s → %s (customer=%s)", user_id, plan, customer_id)

    elif etype in ("customer.subscription.deleted", "customer.subscription.updated"):
        # Downgrade to free if subscription is no longer active.
        if obj.get("status") in ("canceled", "incomplete_expired"):
            customer = obj.get("customer")
            from ..store import _store as raw_store  # internal — fine here
            user = next((u for u in raw_store.users_by_id.values() if u.stripe_customer_id == customer), None)
            if user:
                set_plan(user.id, "free")
                log.info("Downgraded %s → free", user.id)

    return {"received": True}
