"""User service."""
import bcrypt
from typing import Optional, Dict, Any
from data import get_db, UserRepository

class UserService:
    """Service for user operations."""
    
    @staticmethod
    def get_user_details(user_id: int) -> Dict[str, Any]:
        """Get user details."""
        conn = get_db()
        try:
            user = UserRepository.get_user_by_id(conn, user_id)
            if not user:
                raise ValueError("User not found")
            return {"user_id": user[0], "name": user[1], "email": user[2], "role": user[3]}
        finally:
            conn.close()
    
    @staticmethod
    def check_profile_completion(user_id: int) -> Dict[str, Any]:
        """Check if user has completed their profile setup."""
        conn = get_db()
        try:
            role = UserRepository.get_user_role(conn, user_id)
            if not role:
                raise ValueError("User not found")
            
            # If role is pending, profile is incomplete
            if role == "pending" or not role:
                return {"completed": False, "reason": "role_not_selected", "user_id": user_id}
            
            # Check if profile exists based on role
            profile_exists = UserRepository.check_profile_exists(conn, user_id, role)
            
            if not profile_exists:
                return {"completed": False, "reason": "profile_not_created", "user_id": user_id, "role": role}
            
            return {"completed": True, "user_id": user_id, "role": role}
        finally:
            conn.close()
    
    @staticmethod
    def set_role(user_id: int, role: str) -> dict:
        """Set user role."""
        conn = get_db()
        try:
            if not UserRepository.update_user_role(conn, user_id, role):
                raise ValueError("User not found")
            return {"message": f"Role '{role}' assigned successfully"}
        finally:
            conn.close()
    
    @staticmethod
    def update_user_details(user_id: int, name: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
        """Update user details."""
        conn = get_db()
        try:
            # Check if email already exists
            if email and UserRepository.check_email_exists(conn, email, exclude_user_id=user_id):
                raise ValueError("Email already in use")
            
            result = UserRepository.update_user_details(conn, user_id, name, email)
            if not result:
                raise ValueError("No fields to update or user not found")
            
            return {
                "message": "User details updated successfully",
                "user_id": result[0],
                "name": result[1],
                "email": result[2],
                "role": result[3]
            }
        finally:
            conn.close()
    
    @staticmethod
    def change_password(user_id: int, current_password: str, new_password: str) -> dict:
        """Change user password."""
        conn = get_db()
        try:
            user = UserRepository.get_user_by_id(conn, user_id)
            if not user:
                raise ValueError("User not found")
            
            # Get stored password
            db_user = UserRepository.get_user_by_email(conn, user[2])  # user[2] is email
            if not db_user:
                raise ValueError("User not found")
            
            stored_pw = db_user[1]  # db_user[1] is password
            
            # Verify current password
            if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
                if not bcrypt.checkpw(current_password.encode('utf-8'), stored_pw.encode('utf-8')):
                    raise ValueError("Current password is incorrect")
            else:
                if current_password != stored_pw:
                    raise ValueError("Current password is incorrect")
            
            # Hash new password
            import bcrypt
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update password
            UserRepository.update_user_password(conn, user_id, hashed_password)
            
            return {"message": "Password changed successfully"}
        finally:
            conn.close()

