"""User controller."""
from fastapi import HTTPException, status
from services import UserService
from models import SetRoleRequest, UpdateUserRequest, ChangePasswordRequest

class UserController:
    """Controller for user endpoints."""
    
    @staticmethod
    def get_user_details(user_id: int):
        """Get user details."""
        try:
            return UserService.get_user_details(user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def check_profile_completion(user_id: int):
        """Check profile completion."""
        try:
            return UserService.check_profile_completion(user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def set_role(data: SetRoleRequest):
        """Set user role."""
        try:
            return UserService.set_role(data.user_id, data.role)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def update_user_details(update_data: UpdateUserRequest, user_id: int):
        """Update user details."""
        try:
            return UserService.update_user_details(user_id, update_data.name, update_data.email)
        except ValueError as e:
            error_msg = str(e)
            if "email" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def change_password(password_data: ChangePasswordRequest, user_id: int):
        """Change password."""
        try:
            return UserService.change_password(user_id, password_data.current_password, password_data.new_password)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

