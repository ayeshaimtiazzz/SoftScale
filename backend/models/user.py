"""User models."""
from pydantic import BaseModel
from typing import Optional

class SetRoleRequest(BaseModel):
    """Set user role request model."""
    user_id: int
    role: str  # "job_seeker", "freelancer", "company_admin"

class UpdateUserRequest(BaseModel):
    """Update user details request model."""
    name: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    """Change password request model."""
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    """Notification preferences model."""
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    billing_alerts: Optional[bool] = True
    marketing_emails: Optional[bool] = False

