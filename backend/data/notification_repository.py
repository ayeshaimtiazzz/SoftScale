"""Notification repository."""
import psycopg2
from typing import List, Dict, Any, Optional

class NotificationRepository:
    """Repository for notification operations."""

    @staticmethod
    def ensure_notifications_table(conn):
        """Ensure notifications table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    notification_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
                    proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE SET NULL,
                    job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
                    project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

                    -- Notification details
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'info',
                    is_read BOOLEAN DEFAULT FALSE,

                    -- Related entity info
                    related_entity_type VARCHAR(50),
                    related_entity_id INTEGER,

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_deal_id ON notifications(deal_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
                CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            """)
            conn.commit()

    @staticmethod
    def create_notification(
        conn,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = 'info',
        deal_id: Optional[int] = None,
        proposal_id: Optional[int] = None,
        job_id: Optional[int] = None,
        project_id: Optional[int] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> int:
        """Create a new notification and return notification_id."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notifications (
                    user_id, deal_id, proposal_id, job_id, project_id,
                    title, message, type, related_entity_type, related_entity_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING notification_id
            """, (
                user_id, deal_id, proposal_id, job_id, project_id,
                title, message, notification_type, related_entity_type, related_entity_id
            ))
            notification_id = cur.fetchone()[0]
            conn.commit()
            return notification_id

    @staticmethod
    def get_notifications_by_user(conn, user_id: int, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get all notifications for a user."""
        with conn.cursor() as cur:
            query = """
                SELECT * FROM notifications
                WHERE user_id = %s
            """
            params = [user_id]

            if unread_only:
                query += " AND is_read = FALSE"

            query += " ORDER BY created_at DESC LIMIT 100"

            cur.execute(query, params)
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            notifications = []

            for row in rows:
                notification = dict(zip(colnames, row))
                # Format dates
                if notification.get('created_at'):
                    notification['created_at'] = notification['created_at'].isoformat()
                if notification.get('read_at'):
                    notification['read_at'] = notification['read_at'].isoformat()
                notifications.append(notification)

            return notifications

    @staticmethod
    def mark_as_read(conn, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE notifications
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE notification_id = %s AND user_id = %s
            """, (notification_id, user_id))
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def mark_all_as_read(conn, user_id: int) -> int:
        """Mark all notifications as read for a user."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE notifications
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND is_read = FALSE
            """, (user_id,))
            conn.commit()
            return cur.rowcount

    @staticmethod
    def get_unread_count(conn, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM notifications
                WHERE user_id = %s AND is_read = FALSE
            """, (user_id,))
            return cur.fetchone()[0] or 0

