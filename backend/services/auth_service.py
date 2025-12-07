"""Authentication service."""
import bcrypt
from data import get_db, UserRepository
from utils.jwt import create_access_token

class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def signup(name: str, email: str, password: str) -> dict:
        """Sign up a new user."""
        conn = get_db()
        try:
            # Check if user already exists
            if UserRepository.get_user_by_email(conn, email):
                raise ValueError("User already exists")
            
            # Hash password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create user
            user_id = UserRepository.create_user(conn, name, email, hashed_password)
            
            return {"message": "User created successfully", "user_id": user_id}
        finally:
            conn.close()
    
    @staticmethod
    def login(email: str, password: str) -> dict:
        """Login a user."""
        conn = get_db()
        try:
            db_user = UserRepository.get_user_by_email(conn, email)
            if not db_user:
                raise ValueError("Incorrect username")
            
            user_id, stored_pw, role = db_user
            
            # CASE 1: stored_pw is bcrypt hash
            if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
                if not bcrypt.checkpw(password.encode('utf-8'), stored_pw.encode('utf-8')):
                    raise ValueError("Incorrect password")
            
            # CASE 2: stored_pw is plaintext → upgrade it
            else:
                if password != stored_pw:
                    raise ValueError("Incorrect password")
                
                # Automatically hash and update password for next time
                hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                UserRepository.update_user_password(conn, user_id, hashed_pw)
            
            # Generate JWT token
            token = create_access_token({"user_id": user_id, "role": role})
            return {"access_token": token, "token_type": "bearer", "role": role}
        finally:
            conn.close()
