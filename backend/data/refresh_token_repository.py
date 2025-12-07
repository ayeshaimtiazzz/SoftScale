"""Refresh token data repository."""
from datetime import datetime, timedelta
from typing import Optional, Dict
from config import settings

class RefreshTokenRepository:
    """Repository for refresh token-related database operations."""
    
    @staticmethod
    def store_refresh_token(conn, user_id: int, refresh_token: str):
        """Store refresh token in database."""
        expires_at = datetime.utcnow() + timedelta(hours=settings.JWT_REFRESH_TOKEN_EXPIRE_HOURS)
        with conn.cursor() as cur:
            # Revoke old tokens for this user
            cur.execute(
                "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = %s AND is_revoked = FALSE",
                (user_id,)
            )
            # Insert new token
            cur.execute(
                """INSERT INTO refresh_tokens (user_id, refresh_token, expires_at, last_activity)
                   VALUES (%s, %s, %s, %s)""",
                (user_id, refresh_token, expires_at, datetime.utcnow())
            )
            conn.commit()
    
    @staticmethod
    def get_refresh_token(conn, refresh_token: str) -> Optional[tuple]:
        """Get refresh token record."""
        with conn.cursor() as cur:
            cur.execute(
                """SELECT user_id, created_at, last_activity, expires_at, is_revoked
                   FROM refresh_tokens
                   WHERE refresh_token = %s AND is_revoked = FALSE""",
                (refresh_token,)
            )
            return cur.fetchone()
    
    @staticmethod
    def update_last_activity(conn, refresh_token: str):
        """Update last activity timestamp for refresh token."""
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE refresh_tokens SET last_activity = %s WHERE refresh_token = %s",
                (datetime.utcnow(), refresh_token)
            )
            conn.commit()
    
    @staticmethod
    def update_last_activity_by_user(conn, user_id: int):
        """Update last activity for all active refresh tokens for a user."""
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE refresh_tokens 
                   SET last_activity = %s 
                   WHERE user_id = %s AND is_revoked = FALSE 
                   AND expires_at > %s""",
                (datetime.utcnow(), user_id, datetime.utcnow())
            )
            conn.commit()
    
    @staticmethod
    def revoke_token(conn, refresh_token: str):
        """Revoke a refresh token."""
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE refresh_tokens SET is_revoked = TRUE WHERE refresh_token = %s",
                (refresh_token,)
            )
            conn.commit()

