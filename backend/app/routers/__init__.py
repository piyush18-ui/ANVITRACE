"""API routers package."""

from app.routers.dataset import router as dataset_router
from app.routers.investigations import account_router, investigation_router
from app.routers.recovery import router as recovery_router
from app.routers.syndicate import router as syndicate_router

__all__ = [
    "account_router",
    "dataset_router",
    "investigation_router",
    "recovery_router",
    "syndicate_router",
]
