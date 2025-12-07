"""Authentication routes."""
from fastapi import APIRouter, Depends
from controllers import AuthController
from models import UserSignup, UserLogin, RefreshTokenRequest
from middleware import get_current_user

router = APIRouter()

@router.post("/signup")
def signup(user: UserSignup):
    """User signup endpoint."""
    return AuthController.signup(user)

@router.post("/login")
def login(user: UserLogin):
    """User login endpoint."""
    return AuthController.login(user)

@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest):
    """Refresh access token endpoint."""
    return AuthController.refresh_token(request)

@router.post("/logout")
def logout(user_id: int = Depends(get_current_user)):
    """User logout endpoint - revokes all refresh tokens for the user."""
    return AuthController.logout(user_id)

