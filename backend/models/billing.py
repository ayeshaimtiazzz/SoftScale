"""Billing models."""
from pydantic import BaseModel
from typing import List

class PaymentMethod(BaseModel):
    """Payment method model."""
    card_type: str
    last_four: str
    expiry_month: int
    expiry_year: int
    is_default: bool = False

class SubscriptionPlan(BaseModel):
    """Subscription plan model."""
    plan_name: str
    price: float
    billing_cycle: str  # "monthly", "yearly"
    features: List[str]

class BillingHistoryItem(BaseModel):
    """Billing history item model."""
    invoice_id: str
    date: str
    amount: float
    status: str  # "paid", "pending", "failed"
    description: str
