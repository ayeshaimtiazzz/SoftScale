"""Notification controller."""
from fastapi import HTTPException, status
from services import NotificationService

class NotificationController:
    """Controller for notification endpoints."""

    @staticmethod
    def get_notifications(user_id: int, unread_only: bool = False):
        """Get all notifications for a user."""
        try:
            notifications = NotificationService.get_notifications(user_id, unread_only)
            return {"success": True, "notifications": notifications}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def mark_as_read(notification_id: int, user_id: int):
        """Mark a notification as read."""
        try:
            return NotificationService.mark_as_read(notification_id, user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def mark_all_as_read(user_id: int):
        """Mark all notifications as read."""
        try:
            return NotificationService.mark_all_as_read(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_unread_count(user_id: int):
        """Get count of unread notifications."""
        try:
            count = NotificationService.get_unread_count(user_id)
            return {"success": True, "count": count}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

