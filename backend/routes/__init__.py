"""Routes module."""
from .auth_routes import router as auth_router
from .user_routes import router as user_router
from .profile_routes import router as profile_router
from .job_routes import router as job_router
from .talent_routes import router as talent_router
from .billing_routes import router as billing_router
from .api_routes import router as api_router
from .proposal_routes import router as proposal_router
from .deal_routes import router as deal_router
from .note_routes import router as note_router
from .notification_routes import router as notification_router
from .sentiment_routes import router as sentiment_router
from .deal_conversation_routes import router as deal_conversation_router
from .price_prediction_routes import router as price_prediction_router

__all__ = [
    "auth_router",
    "user_router",
    "profile_router",
    "job_router",
    "talent_router",
    "billing_router",
    "api_router",
    "proposal_router",
    "deal_router",
    "note_router",
    "notification_router",
    "sentiment_router",
    "deal_conversation_router",
    "price_prediction_router",
]
