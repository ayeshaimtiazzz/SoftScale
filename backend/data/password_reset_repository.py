"""Password reset token repository."""
import psycopg2
from typing import Optional, Tuple
from datetime import datetime, timedelta

class PasswordResetRepository:
    """Repository for password reset token operations."""

    @staticmethod
    def create_reset_token(conn, user_id: int, token: str, expires_in_hours: int = 1) -> bool:
        """Create a password reset token."""
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        with conn.cursor() as cur:
            # Delete any existing tokens for this user
            cur.execute("DELETE FROM password_reset_tokens WHERE user_id = %s;", (user_id,))
            # Insert new token
            cur.execute("""
                INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
                VALUES (%s, %s, %s, %s);
            """, (user_id, token, expires_at, datetime.utcnow()))
            conn.commit()
            return True

    @staticmethod
    def get_token_info(conn, token: str) -> Optional[Tuple[int, datetime, bool]]:
        """Get token information: (user_id, expires_at, is_used)."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, expires_at, is_used
                FROM password_reset_tokens
                WHERE token = %s;
            """, (token,))
            result = cur.fetchone()
            return result if result else None

    @staticmethod
    def mark_token_as_used(conn, token: str) -> bool:
        """Mark a token as used."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE password_reset_tokens
                SET is_used = TRUE, used_at = %s
                WHERE token = %s;
            """, (datetime.utcnow(), token))
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def delete_expired_tokens(conn) -> int:
        """Delete expired tokens. Returns count of deleted tokens."""
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM password_reset_tokens
                WHERE expires_at < %s OR is_used = TRUE;
            """, (datetime.utcnow(),))
            conn.commit()
            return cur.rowcount


