"""Deal routes."""
from fastapi import APIRouter, Depends, Path, Query
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

@router.get("/deals/metrics")
def get_deal_metrics(user_id: int = Depends(get_current_user)):
    """Get deal metrics for the current user."""
    return DealController.get_deal_metrics(user_id)

@router.get("/deals/{deal_id}")
def get_deal(deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"), user_id: int = Depends(get_current_user)):
    """Get a deal by ID. Only accepts numeric IDs or 'deal-{number}' format."""
    return DealController.get_deal(deal_id, user_id)

@router.put("/deals/{deal_id}")
def update_deal(
    deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"),
    request: UpdateDealRequest = None,
    user_id: int = Depends(get_current_user)
):
    """Update a deal. Only accepts numeric IDs or 'deal-{number}' format."""
    return DealController.update_deal(deal_id, request, user_id)

@router.patch("/deals/{deal_id}/stage")
def update_deal_stage(
    deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"),
    request: UpdateDealStageRequest = None,
    user_id: int = Depends(get_current_user)
):
    """Update deal stage (for drag-and-drop). Only accepts numeric IDs or 'deal-{number}' format."""
    return DealController.update_deal_stage(deal_id, request, user_id)

@router.delete("/deals/{deal_id}")
def delete_deal(deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"), user_id: int = Depends(get_current_user)):
    """Delete a deal. Only accepts numeric IDs or 'deal-{number}' format."""
    return DealController.delete_deal(deal_id, user_id)

@router.post("/deals/from-project/{project_id}")
def create_deal_from_project(project_id: int = Path(...), user_id: int = Depends(get_current_user)):
    """Create a deal from a project."""
    return DealController.create_deal_from_project(project_id, user_id)

@router.get("/deals/for-talent")
def get_deals_for_talent(
    talent_id: str = Query(...),
    role: str = Query(...),
    user_id: int = Depends(get_current_user)
):
    """Get all deals where user is the talent (for job seekers/freelancers)."""
    return DealController.get_deals_for_talent(user_id, talent_id, role)

@router.post("/deals/from-job/{job_id}")
def create_deal_from_job(
    job_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Create a deal from a job (for freelancers and job seekers)."""
    # Get user role from database
    from data import get_db, UserRepository
    conn = get_db()
    try:
        user = UserRepository.get_user_by_id(conn, user_id)
        if not user:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user_role = user[3] if len(user) > 3 else None  # role is at index 3
        if not user_role:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User role not set")
    finally:
        conn.close()

    return DealController.create_deal_from_job(job_id, user_id, user_role)

@router.post("/deals/from-project-freelancer/{project_id}")
def create_deal_from_project_for_freelancer(
    project_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Create a deal from a project (for freelancers only)."""
    return DealController.create_deal_from_project_for_freelancer(project_id, user_id)
