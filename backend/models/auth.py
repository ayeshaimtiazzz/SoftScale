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
