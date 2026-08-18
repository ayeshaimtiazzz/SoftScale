"""Pydantic models for request/response validation."""
from .auth import UserSignup, UserLogin, RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest
from .user import SetRoleRequest, UpdateUserRequest, ChangePasswordRequest, NotificationPreferences
from .profile import CompanyProfile, UpdateCompanyProfileRequest, FreelancerProfile
from .job import PostJobRequest, PostProjectRequest
from .billing import PaymentMethod, SubscriptionPlan, BillingHistoryItem
from .deal import CreateDealRequest, UpdateDealRequest, UpdateDealStageRequest

__all__ = [
    "UserSignup",
    "UserLogin",
    "RefreshTokenRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "SetRoleRequest",
    "UpdateUserRequest",
    "ChangePasswordRequest",
    "NotificationPreferences",
    "CompanyProfile",
    "UpdateCompanyProfileRequest",
    "FreelancerProfile",
    "PostJobRequest",
    "PostProjectRequest",
    "PaymentMethod",
    "SubscriptionPlan",
    "BillingHistoryItem",
    "CreateDealRequest",
    "UpdateDealRequest",
    "UpdateDealStageRequest",
]

