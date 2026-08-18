"""User data repository."""
import psycopg2
from typing import Optional, Dict, Any

class UserRepository:
    """Repository for user-related database operations."""
    
    @staticmethod
    def get_user_by_email(conn, email: str) -> Optional[tuple]:
        """Get user by email."""
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, password, role FROM users WHERE email = %s;", (email,))
            return cur.fetchone()
    
    @staticmethod
    def get_user_by_id(conn, user_id: int) -> Optional[tuple]:
        """Get user by ID."""
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, name, email, role FROM users WHERE user_id = %s", (user_id,))
            return cur.fetchone()
    
    @staticmethod
    def create_user(conn, name: str, email: str, hashed_password: str) -> int:
        """Create a new user."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (name, email, password, role)
                VALUES (%s, %s, %s, %s)
                RETURNING user_id;
            """, (name, email, hashed_password, 'pending'))
            user_id = cur.fetchone()[0]
            conn.commit()
            return user_id
    
    @staticmethod
    def update_user_role(conn, user_id: int, role: str) -> bool:
        """Update user role."""
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET role = %s WHERE user_id = %s RETURNING user_id;", 
                        (role, user_id))
            result = cur.fetchone()
            if result:
                conn.commit()
                return True
            return False
    
    @staticmethod
    def update_user_password(conn, user_id: int, hashed_password: str) -> bool:
        """Update user password."""
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET password = %s WHERE user_id = %s", 
                       (hashed_password, user_id))
            conn.commit()
            return True
    
    @staticmethod
    def update_user_details(conn, user_id: int, name: Optional[str] = None, 
                           email: Optional[str] = None) -> Optional[tuple]:
        """Update user details."""
        updates = []
        values = []
        
        if name:
            updates.append("name = %s")
            values.append(name)
        
        if email:
            updates.append("email = %s")
            values.append(email)
        
        if not updates:
            return None
        
        values.append(user_id)
        
        with conn.cursor() as cur:
            query = f"UPDATE users SET {', '.join(updates)} WHERE user_id = %s RETURNING user_id, name, email, role"
            cur.execute(query, values)
            result = cur.fetchone()
            if result:
                conn.commit()
                return result
            return None
    
    @staticmethod
    def check_email_exists(conn, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if email already exists."""
        with conn.cursor() as cur:
            if exclude_user_id:
                cur.execute("SELECT user_id FROM users WHERE email = %s AND user_id != %s", 
                           (email, exclude_user_id))
            else:
                cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            return cur.fetchone() is not None
    
    @staticmethod
    def get_user_role(conn, user_id: int) -> Optional[str]:
        """Get user role."""
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def check_profile_exists(conn, user_id: int, role: str) -> bool:
        """Check if profile exists for a user based on role."""
        with conn.cursor() as cur:
            if role == "freelancer":
                cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s LIMIT 1", (user_id,))
            elif role == "job_seeker":
                cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s LIMIT 1", (user_id,))
            elif role in ("company_admin", "company"):
                cur.execute("SELECT company_id FROM company WHERE user_id = %s LIMIT 1", (user_id,))
            else:
                return False
            return cur.fetchone() is not None

