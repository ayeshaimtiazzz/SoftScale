"""Authentication middleware."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import threading
from config import settings
from data import get_db, RefreshTokenRepository

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user_id. Also updates last_activity for refresh tokens."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # Best-effort async touch; never block request auth path on DB locks/timeouts.
        def _touch_last_activity(uid: int) -> None:
            conn = get_db()
            try:
                RefreshTokenRepository.update_last_activity_by_user(conn, uid)
            except Exception:
                # Ignore touch failures; token validity should not depend on DB write.
                pass
            finally:
                conn.close()

        threading.Thread(
            target=_touch_last_activity,
            args=(user_id,),
            daemon=True,
            name="refresh_token_activity_touch",
        ).start()

        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def get_current_user(user_id: int = Depends(verify_token)):
    """Get current authenticated user (alias for verify_token for clarity)."""
    return user_id

