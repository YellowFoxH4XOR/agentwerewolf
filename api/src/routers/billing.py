from fastapi import APIRouter, HTTPException, Request, status

from ..auth import CurrentUser

router = APIRouter()


@router.post("/checkout")
def checkout(plan: str, user: CurrentUser) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "stripe_checkout")


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "stripe_webhook")
