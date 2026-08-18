"""Billing controller."""
from fastapi import HTTPException, status
from services import BillingService
from models import SubscriptionPlan, PaymentMethod

class BillingController:
    """Controller for billing endpoints."""
    
    @staticmethod
    def get_subscription(user_id: int):
        """Get user subscription."""
        try:
            return BillingService.get_subscription(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def update_subscription(subscription: SubscriptionPlan, user_id: int):
        """Update user subscription."""
        try:
            return BillingService.update_subscription(user_id, subscription.plan_name, subscription.price, subscription.billing_cycle)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_payment_methods(user_id: int):
        """Get user payment methods."""
        try:
            return BillingService.get_payment_methods(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def add_payment_method(payment_method: PaymentMethod, user_id: int):
        """Add payment method."""
        try:
            return BillingService.add_payment_method(
                user_id, payment_method.card_type, payment_method.last_four,
                payment_method.expiry_month, payment_method.expiry_year, payment_method.is_default
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def delete_payment_method(payment_method_id: int, user_id: int):
        """Delete payment method."""
        try:
            return BillingService.delete_payment_method(payment_method_id, user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_billing_history(user_id: int):
        """Get billing history."""
        try:
            return BillingService.get_billing_history(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_notification_preferences(user_id: int):
        """Get notification preferences."""
        try:
            return BillingService.get_notification_preferences(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def update_notification_preferences(preferences, user_id: int):
        """Update notification preferences."""
        try:
            return BillingService.update_notification_preferences(
                user_id,
                preferences.email_notifications if preferences.email_notifications is not None else True,
                preferences.push_notifications if preferences.push_notifications is not None else True,
                preferences.billing_alerts if preferences.billing_alerts is not None else True,
                preferences.marketing_emails if preferences.marketing_emails is not None else False
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

