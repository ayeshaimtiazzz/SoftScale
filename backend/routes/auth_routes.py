"""Authentication routes."""
from fastapi import APIRouter
from controllers import AuthController
from models import UserSignup, UserLogin

router = APIRouter()

@router.post("/signup")
def signup(user: UserSignup):
    """User signup endpoint."""
    return AuthController.signup(user)

@router.post("/login")
def login(user: UserLogin):
    """User login endpoint."""
    return AuthController.login(user)
