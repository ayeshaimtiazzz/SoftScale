"""Data layer for database operations."""
from .database import get_db, connect_db
from .user_repository import UserRepository
from .profile_repository import ProfileRepository
from .job_repository import JobRepository
from .billing_repository import BillingRepository
from .refresh_token_repository import RefreshTokenRepository
from .password_reset_repository import PasswordResetRepository
from .proposal_repository import ProposalRepository
from .deal_repository import DealRepository
from .note_repository import NoteRepository
from .notification_repository import NotificationRepository
from .prospect_repository import ProspectRepository
from .deal_conversation_repository import DealConversationRepository
from .deal_sentiment_repository import DealSentimentRepository
from .price_prediction_repository import (
    PricePredictionRepository,
    attach_prediction_to_deal_safe,
    persist_feedback_safe,
    persist_prediction_safe,
)

__all__ = [
    "get_db",
    "connect_db",
    "UserRepository",
    "ProfileRepository",
    "JobRepository",
    "BillingRepository",
    "RefreshTokenRepository",
    "PasswordResetRepository",
    "ProposalRepository",
    "DealRepository",
    "NoteRepository",
    "NotificationRepository",
    "ProspectRepository",
    "DealConversationRepository",
    "DealSentimentRepository",
    "PricePredictionRepository",
    "attach_prediction_to_deal_safe",
    "persist_prediction_safe",
    "persist_feedback_safe",
]

