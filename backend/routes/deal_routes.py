"""Deal routes."""
from fastapi import APIRouter, Depends, Path
from controllers import DealController
from models import CreateDealRequest, UpdateDealRequest, UpdateDealStageRequest
from middleware import get_current_user

router = APIRouter()

@router.post("/deals")
def create_deal(request: CreateDealRequest, user_id: int = Depends(get_current_user)):
    """Create a new deal."""
    return DealController.create_deal(request, user_id)

@router.get("/deals")
def get_all_deals(user_id: int = Depends(get_current_user)):
    """Get all deals for the current user."""
    return DealController.get_all_deals(user_id)

@router.get("/deals/{deal_id}")
def get_deal(deal_id: str = Path(...), user_id: int = Depends(get_current_user)):
    """Get a deal by ID."""
    return DealController.get_deal(deal_id, user_id)

@router.put("/deals/{deal_id}")
def update_deal(
    deal_id: str = Path(...),
    request: UpdateDealRequest = None,
    user_id: int = Depends(get_current_user)
):
    """Update a deal."""
    return DealController.update_deal(deal_id, request, user_id)

@router.patch("/deals/{deal_id}/stage")
def update_deal_stage(
    deal_id: str = Path(...),
    request: UpdateDealStageRequest = None,
    user_id: int = Depends(get_current_user)
):
    """Update deal stage (for drag-and-drop)."""
    return DealController.update_deal_stage(deal_id, request, user_id)

@router.delete("/deals/{deal_id}")
def delete_deal(deal_id: str = Path(...), user_id: int = Depends(get_current_user)):
    """Delete a deal."""
    return DealController.delete_deal(deal_id, user_id)

@router.get("/deals/metrics")
def get_deal_metrics(user_id: int = Depends(get_current_user)):
    """Get deal metrics for the current user."""
    return DealController.get_deal_metrics(user_id)
