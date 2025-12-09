"""Notification service."""
from typing import Dict, Any, List
from data import get_db, NotificationRepository

class NotificationService:
    """Service for notification operations."""

    @staticmethod
    def create_notification(
        user_id: int,
        title: str,
        message: str,
        notification_type: str = 'info',
        deal_id: int = None,
        proposal_id: int = None,
        job_id: int = None,
        project_id: int = None,
        related_entity_type: str = None,
        related_entity_id: int = None
    ) -> Dict[str, Any]:
        """Create a new notification."""
        conn = get_db()
        try:
            NotificationRepository.ensure_notifications_table(conn)
            notification_id = NotificationRepository.create_notification(
                conn, user_id, title, message, notification_type,
                deal_id, proposal_id, job_id, project_id,
                related_entity_type, related_entity_id
            )
            return {"success": True, "notification_id": notification_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_notifications(user_id: int, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get all notifications for a user."""
        conn = get_db()
        try:
            NotificationRepository.ensure_notifications_table(conn)
            return NotificationRepository.get_notifications_by_user(conn, user_id, unread_only)
        finally:
            conn.close()

    @staticmethod
    def mark_as_read(notification_id: int, user_id: int) -> Dict[str, Any]:
        """Mark a notification as read."""
        conn = get_db()
        try:
            updated = NotificationRepository.mark_as_read(conn, notification_id, user_id)
            if not updated:
                raise ValueError("Notification not found or unauthorized")
            return {"success": True, "message": "Notification marked as read"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def mark_all_as_read(user_id: int) -> Dict[str, Any]:
        """Mark all notifications as read."""
        conn = get_db()
        try:
            count = NotificationRepository.mark_all_as_read(conn, user_id)
            return {"success": True, "count": count, "message": f"{count} notifications marked as read"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_unread_count(user_id: int) -> int:
        """Get count of unread notifications."""
        conn = get_db()
        try:
            NotificationRepository.ensure_notifications_table(conn)
            return NotificationRepository.get_unread_count(conn, user_id)
        finally:
            conn.close()

