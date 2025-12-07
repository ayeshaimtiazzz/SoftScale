"""User routes."""
from fastapi import APIRouter, Depends
from controllers import UserController
from models import SetRoleRequest, UpdateUserRequest, ChangePasswordRequest
from middleware import get_current_user

router = APIRouter()

@router.get("/get-user-details")
def get_user_details(user_id: int = Depends(get_current_user)):
    """Get user details endpoint."""
    return UserController.get_user_details(user_id)

@router.get("/check-profile-completion")
def check_profile_completion(user_id: int = Depends(get_current_user)):
    """Check profile completion endpoint."""
    return UserController.check_profile_completion(user_id)

@router.post("/set-role")
def set_role(data: SetRoleRequest):
    """Set user role endpoint."""
    return UserController.set_role(data)

@router.put("/update-user-details")
def update_user_details(update_data: UpdateUserRequest, user_id: int = Depends(get_current_user)):
    """Update user details endpoint."""
    return UserController.update_user_details(update_data, user_id)

@router.post("/change-password")
def change_password(password_data: ChangePasswordRequest, user_id: int = Depends(get_current_user)):
    """Change password endpoint."""
    return UserController.change_password(password_data, user_id)
