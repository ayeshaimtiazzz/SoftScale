"""Deal routes."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field

from controllers import DealController
from data import get_db
from data.deal_activity_repository import DealActivityRepository
from data.price_prediction_repository import (
    PricePredictionRepository,
    attach_prediction_to_deal_safe,
    persist_prediction_safe,
)
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


def _derive_deal_feature_hints(deal: dict, scope_text: str) -> List[str]:
    """
    Auto-derive hints from deal context for sparse descriptions to avoid zero-feature failures.
    """
    from ai.price_predictor.feature_extractor import normalize_user_features

    text = " ".join(
        [
            str(scope_text or ""),
            str(deal.get("deal_title") or deal.get("dealTitle") or ""),
            str(deal.get("skills") or ""),
            str(deal.get("experience") or ""),
            str(deal.get("work_model") or deal.get("workModel") or ""),
        ]
    ).lower()

    raw_hints: List[str] = []
    if any(k in text for k in ["auth", "login", "signin", "account"]):
        raw_hints.append("login")
    if any(k in text for k in ["dashboard", "analytics", "report"]):
        raw_hints.append("dashboard")
    if any(k in text for k in ["api", "integration", "backend", "webhook"]):
        raw_hints.append("api integration")
    if any(k in text for k in ["payment", "stripe", "checkout", "billing"]):
        raw_hints.append("payment integration")
    if any(k in text for k in ["chatbot", "assistant", "ai", "llm"]):
        raw_hints.append("ai chatbot")
    if any(k in text for k in ["admin", "management panel", "portal"]):
        raw_hints.append("admin panel")
    if any(k in text for k in ["database", "db", "postgres", "mysql", "storage"]):
        raw_hints.append("database setup")

    normalized = normalize_user_features(raw_hints)
    if normalized:
        return normalized
    # Generic fallback if we still have scope text but no explicit keywords.
    return ["dashboard", "database setup"] if str(scope_text or "").strip() else []

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
        "features": body.features or _derive_deal_feature_hints(deal, scope),
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
        attach_prediction_to_deal_safe(
            user_id=user_id,
            deal_id=numeric_id,
            prediction_id=prediction_id,
            result=result,
        )
        from data import log_deal_activity_safe

        log_deal_activity_safe(
            deal_id=numeric_id,
            user_id=user_id,
            event_type="price_prediction_generated",
            title="Price prediction generated",
            description=f"Final {result.get('final_price')} (rule {result.get('rule_based_price')}, ml {result.get('ml_price')})",
            metadata={"prediction_id": prediction_id},
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


@router.get("/deals/{deal_id}/activity")
def get_deal_activity(
    deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"),
    user_id: int = Depends(get_current_user),
):
    """Get activity timeline for a deal, including logged events and price predictions."""
    deal = DealController.get_deal(deal_id, user_id)
    numeric_id = deal.get("deal_id")
    conn = get_db()
    try:
        DealActivityRepository.ensure_table(conn)
        PricePredictionRepository.ensure_tables(conn)
        activity = DealActivityRepository.list_for_deal(conn, int(numeric_id), limit=300)
        price_predictions = PricePredictionRepository.list_by_deal(conn, int(numeric_id), limit=100)
        if not activity:
            # Synthetic baseline events for older deals before activity logging existed.
            if deal.get("created_at") or deal.get("createdAt"):
                activity.append(
                    {
                        "activity_id": None,
                        "deal_id": numeric_id,
                        "user_id": deal.get("user_id"),
                        "event_type": "deal_created",
                        "title": "Deal created",
                        "description": deal.get("deal_title") or deal.get("dealTitle"),
                        "metadata": {},
                        "created_at": deal.get("created_at") or deal.get("createdAt"),
                    }
                )
            if deal.get("updated_at") or deal.get("updatedAt"):
                activity.append(
                    {
                        "activity_id": None,
                        "deal_id": numeric_id,
                        "user_id": deal.get("user_id"),
                        "event_type": "deal_updated",
                        "title": "Deal last updated",
                        "description": None,
                        "metadata": {},
                        "created_at": deal.get("updated_at") or deal.get("updatedAt"),
                    }
                )

        stage = deal.get("stage", "Prospecting")
        next_step_map = {
            "Prospecting": "Send first outreach and start conversation thread",
            "Contacted": "Share initial scope and qualify budget/timeline",
            "Proposal Sent": "Follow up and address objections",
            "Negotiation": "Align on price/scope and target close date",
            "Closed Won": "Kickoff project delivery and onboarding",
            "Closed Lost": "Capture loss reason and re-engagement plan",
        }
        return {
            "success": True,
            "deal_id": numeric_id,
            "current_stage": stage,
            "next_step": next_step_map.get(stage),
            "activity": activity,
            "price_predictions": price_predictions[:10],
        }
    finally:
        conn.close()


@router.get("/deals/{deal_id}/price-predictions")
def list_deal_price_predictions(
    deal_id: str = Path(..., pattern="^(deal-)?[0-9]+$"),
    user_id: int = Depends(get_current_user),
):
    """List historical price predictions linked to a deal."""
    deal = DealController.get_deal(deal_id, user_id)
    numeric_id = deal.get("deal_id")
    conn = get_db()
    try:
        PricePredictionRepository.ensure_tables(conn)
        rows = PricePredictionRepository.list_by_deal(conn, int(numeric_id), limit=200)
        return {"success": True, "deal_id": numeric_id, "predictions": rows}
    finally:
        conn.close()


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
