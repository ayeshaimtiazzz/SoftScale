"""Deal routes."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field

from controllers import DealController
from data.price_prediction_repository import persist_prediction_safe
from middleware import get_current_user
from models import CreateDealRequest, UpdateDealRequest, UpdateDealStageRequest

router = APIRouter()
logger = logging.getLogger(__name__)

_price_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="deal_price_suggest")


class DealPriceSuggestBody(BaseModel):
    """Optional overrides; scope text defaults to the deal's stored description."""

    project_description: Optional[str] = Field(
        None,
        description="Override deal description for this run (e.g. unsaved text in the modal).",
    )
    features: Optional[List[str]] = None
    region: str = "pakistan"
    experience_level: str = "intermediate"
    freelancer_level: str = "mid"
    effort: float = 1.0
    urgency: float = 1.0

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

@router.post("/deals/{deal_id}/price-suggestion")
async def suggest_price_for_deal(
    deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"),
    body: DealPriceSuggestBody = Body(default_factory=DealPriceSuggestBody),
    user_id: int = Depends(get_current_user),
):
    """Run hybrid price prediction using deal scope (description) and same access rules as GET deal."""
    deal = DealController.get_deal(deal_id, user_id)
    if not isinstance(deal, dict):
        raise HTTPException(status_code=404, detail="Deal not found")

    numeric_id = deal.get("deal_id")
    if numeric_id is None and isinstance(deal.get("id"), str) and deal["id"].startswith("deal-"):
        try:
            numeric_id = int(deal["id"].replace("deal-", ""))
        except ValueError:
            numeric_id = None

    stored_desc = (deal.get("description") or "").strip()
    override = (body.project_description or "").strip()
    scope = override or stored_desc
    if not scope:
        title = (deal.get("deal_title") or deal.get("dealTitle") or "").strip()
        if title:
            scope = f"Project: {title}"
    if not scope or len(scope) < 8:
        raise HTTPException(
            status_code=400,
            detail="Deal has no usable scope text. Add a description or pass project_description in the body.",
        )

    payload = {
        "project_description": scope,
        "features": body.features,
        "region": body.region,
        "experience_level": body.experience_level,
        "freelancer_level": body.freelancer_level,
        "effort": body.effort,
        "urgency": body.urgency,
    }

    def _run():
        from ai.price_predictor.pipeline import run_price_prediction
        from ai.price_predictor.service import get_price_model

        model = get_price_model()
        return run_price_prediction(payload, model)

    logger.info("price-suggestion for deal_id=%s user_id=%s", numeric_id, user_id)
    try:
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_price_executor, _run),
            timeout=120.0,
        )
        prediction_id = persist_prediction_safe(
            user_id=user_id,
            deal_id=numeric_id,
            source="deal_price_suggestion",
            payload=payload,
            result=result,
        )
        return {"success": True, "deal_id": numeric_id, "prediction_id": prediction_id, **result}
    except ValueError as e:
        logger.warning("deal price-suggestion validation: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except asyncio.TimeoutError as e:
        raise HTTPException(status_code=504, detail="Price suggestion timed out.") from e
    except Exception as e:
        logger.exception("deal price-suggestion failed: %s", e)
        raise HTTPException(status_code=500, detail="Price suggestion failed.") from e


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
