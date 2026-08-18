"""Billing routes."""
from fastapi import APIRouter, Depends
from controllers import BillingController
from models import SubscriptionPlan, PaymentMethod, NotificationPreferences
from middleware import get_current_user

router = APIRouter(prefix="/api", tags=["billing"])

@router.get("/subscription")
def get_subscription(user_id: int = Depends(get_current_user)):
    """Get subscription endpoint."""
    return BillingController.get_subscription(user_id)

@router.put("/subscription")
def update_subscription(subscription: SubscriptionPlan, user_id: int = Depends(get_current_user)):
    """Update subscription endpoint."""
    return BillingController.update_subscription(subscription, user_id)

@router.get("/payment-methods")
def get_payment_methods(user_id: int = Depends(get_current_user)):
    """Get payment methods endpoint."""
    return BillingController.get_payment_methods(user_id)

@router.post("/payment-methods")
def add_payment_method(payment_method: PaymentMethod, user_id: int = Depends(get_current_user)):
    """Add payment method endpoint."""
    return BillingController.add_payment_method(payment_method, user_id)

@router.delete("/payment-methods/{payment_method_id}")
def delete_payment_method(payment_method_id: int, user_id: int = Depends(get_current_user)):
    """Delete payment method endpoint."""
    return BillingController.delete_payment_method(payment_method_id, user_id)

@router.get("/billing-history")
def get_billing_history(user_id: int = Depends(get_current_user)):
    """Get billing history endpoint."""
    return BillingController.get_billing_history(user_id)

@router.get("/notification-preferences")
def get_notification_preferences(user_id: int = Depends(get_current_user)):
    """Get notification preferences endpoint."""
    return BillingController.get_notification_preferences(user_id)

@router.put("/notification-preferences")
def update_notification_preferences(preferences: NotificationPreferences, user_id: int = Depends(get_current_user)):
    """Update notification preferences endpoint."""
    return BillingController.update_notification_preferences(preferences, user_id)
