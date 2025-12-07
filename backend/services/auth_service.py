"""Authentication service."""
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from data import get_db, UserRepository, RefreshTokenRepository
from utils.jwt import create_access_token, create_refresh_token
from config import settings

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

            # Generate access and refresh tokens
            access_token = create_access_token({"user_id": user_id, "role": role})
            refresh_token = create_refresh_token({"user_id": user_id, "role": role})

            # Store refresh token in database
            RefreshTokenRepository.store_refresh_token(conn, user_id, refresh_token)

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "role": role
            }
        finally:
            conn.close()

    @staticmethod
    def refresh_token(refresh_token: str) -> dict:
        """Refresh access token using refresh token."""
        conn = get_db()
        try:
            # Verify refresh token
            user_info = AuthService.verify_refresh_token(conn, refresh_token)

            if not user_info:
                raise ValueError("Invalid or expired refresh token")

            user_id = user_info["user_id"]
            role = user_info["role"]

            # Generate new access token
            access_token = create_access_token({"user_id": user_id, "role": role})

            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
        finally:
            conn.close()

    @staticmethod
    def verify_refresh_token(conn, refresh_token: str) -> Optional[Dict]:
        """Verify refresh token and return user info if valid."""
        try:
            payload = jwt.decode(refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("user_id")

            if user_id is None:
                return None

            # Check if token exists in database and is not revoked
            token_record = RefreshTokenRepository.get_refresh_token(conn, refresh_token)

            if not token_record:
                return None

            db_user_id, created_at, last_activity, expires_at, is_revoked = token_record

            if db_user_id != user_id or is_revoked:
                return None

            # Check absolute timeout (24 hours from creation)
            if datetime.utcnow() > expires_at:
                return None

            # Check idle timeout (8 hours from last activity)
            idle_timeout = last_activity + timedelta(hours=settings.JWT_IDLE_TIMEOUT_HOURS)
            if datetime.utcnow() > idle_timeout:
                # Revoke token due to idle timeout
                RefreshTokenRepository.revoke_token(conn, refresh_token)
                return None

            # Update last activity
            RefreshTokenRepository.update_last_activity(conn, refresh_token)

            return {"user_id": user_id, "role": payload.get("role")}
        except jwt.PyJWTError:
            return None

