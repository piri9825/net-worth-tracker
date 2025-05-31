from fastapi import APIRouter

api_router = APIRouter()

# Include all endpoint routers here
from .endpoints import accounts, values  # noqa

api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(values.router, prefix="/values", tags=["values"])
