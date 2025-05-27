from fastapi import APIRouter

api_router = APIRouter()

# Include all endpoint routers here
from .endpoints import accounts  # noqa

api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
