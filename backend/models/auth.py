"""Authentication models."""
from pydantic import BaseModel

class UserSignup(BaseModel):
    """User signup request model."""
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    """User login request model."""
    email: str
    password: str

class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    """Forgot password request model."""
    email: str

class ResetPasswordRequest(BaseModel):
    """Reset password request model."""
    email: str
    new_password: str
    confirm_password: str

