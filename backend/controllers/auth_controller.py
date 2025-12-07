"""Authentication controller."""
from fastapi import HTTPException, status
from services import AuthService
from models import UserSignup, UserLogin

class AuthController:
    """Controller for authentication endpoints."""
    
    @staticmethod
    def signup(user: UserSignup):
        """Handle user signup."""
        try:
            return AuthService.signup(user.name, user.email, user.password)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def login(user: UserLogin):
        """Handle user login."""
        try:
            return AuthService.login(user.email, user.password)
        except ValueError as e:
            error_msg = str(e)
            if "username" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username")
            elif "password" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error_msg)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
