"""Notification routes."""
from fastapi import APIRouter, Depends, Path, Query
from controllers import NotificationController
from middleware import get_current_user

router = APIRouter()

@router.get("/notifications")
def get_notifications(
    unread_only: bool = Query(False),
    user_id: int = Depends(get_current_user)
):
    """Get all notifications for a user."""
    return NotificationController.get_notifications(user_id, unread_only)

@router.get("/notifications/unread-count")
def get_unread_count(user_id: int = Depends(get_current_user)):
    """Get count of unread notifications."""
    return NotificationController.get_unread_count(user_id)

@router.post("/notifications/{notification_id}/read")
def mark_as_read(
    notification_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Mark a notification as read."""
    return NotificationController.mark_as_read(notification_id, user_id)

@router.post("/notifications/read-all")
def mark_all_as_read(user_id: int = Depends(get_current_user)):
    """Mark all notifications as read."""
    return NotificationController.mark_all_as_read(user_id)

