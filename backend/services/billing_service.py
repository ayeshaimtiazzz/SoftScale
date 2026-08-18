"""Billing service."""
from typing import Dict, Any, List
from data import get_db, BillingRepository

class BillingService:
    """Service for billing operations."""
    
    @staticmethod
    def get_subscription(user_id: int) -> Dict[str, Any]:
        """Get user subscription."""
        conn = get_db()
        try:
            return BillingRepository.get_subscription(conn, user_id)
        finally:
            conn.close()
    
    @staticmethod
    def update_subscription(user_id: int, plan_name: str, price: float, billing_cycle: str) -> dict:
        """Update user subscription."""
        conn = get_db()
        try:
            BillingRepository.update_subscription(conn, user_id, plan_name, price, billing_cycle)
            return {"message": "Subscription updated successfully"}
        finally:
            conn.close()
    
    @staticmethod
    def get_payment_methods(user_id: int) -> List[Dict[str, Any]]:
        """Get user payment methods."""
        conn = get_db()
        try:
            return BillingRepository.get_payment_methods(conn, user_id)
        finally:
            conn.close()
    
    @staticmethod
    def add_payment_method(user_id: int, card_type: str, last_four: str,
                          expiry_month: int, expiry_year: int, is_default: bool) -> dict:
        """Add payment method."""
        conn = get_db()
        try:
            payment_id = BillingRepository.add_payment_method(conn, user_id, card_type, last_four, expiry_month, expiry_year, is_default)
            return {"message": "Payment method added successfully", "payment_method_id": payment_id}
        finally:
            conn.close()
    
    @staticmethod
    def delete_payment_method(payment_method_id: int, user_id: int) -> dict:
        """Delete payment method."""
        conn = get_db()
        try:
            if not BillingRepository.delete_payment_method(conn, payment_method_id, user_id):
                raise ValueError("Payment method not found or not authorized")
            return {"message": "Payment method deleted successfully"}
        finally:
            conn.close()
    
    @staticmethod
    def get_billing_history(user_id: int) -> List[Dict[str, Any]]:
        """Get billing history."""
        conn = get_db()
        try:
            return BillingRepository.get_billing_history(conn, user_id)
        finally:
            conn.close()
    
    @staticmethod
    def get_notification_preferences(user_id: int) -> Dict[str, bool]:
        """Get notification preferences."""
        conn = get_db()
        try:
            return BillingRepository.get_notification_preferences(conn, user_id)
        finally:
            conn.close()
    
    @staticmethod
    def update_notification_preferences(user_id: int, email_notifications: bool,
                                       push_notifications: bool, billing_alerts: bool,
                                       marketing_emails: bool) -> dict:
        """Update notification preferences."""
        conn = get_db()
        try:
            BillingRepository.update_notification_preferences(conn, user_id, email_notifications, push_notifications, billing_alerts, marketing_emails)
            return {"message": "Notification preferences updated successfully"}
        finally:
            conn.close()

