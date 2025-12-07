"""Proposal generation routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from controllers.proposal_controller import ProposalController
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


class GenerateProposalRequest(BaseModel):
    """Request model for proposal generation."""
    prompt: str
    tone: str = "Professional"
    template_id: Optional[int] = None


@router.get("/templates")
def get_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    user_id: int = Depends(get_current_user)
):
    """Get all proposal templates with optional filters."""
    result = ProposalController.get_templates(category=category, domain=domain)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to fetch templates"))
    return result


@router.get("/templates/{template_id}")
def get_template(
    template_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get a specific template by ID."""
    result = ProposalController.get_template(template_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Template not found"))
    return result


@router.get("/templates/search")
def search_templates(
    q: str = Query(..., description="Search query", min_length=2),
    user_id: int = Depends(get_current_user)
):
    """Search templates by query."""
    result = ProposalController.search_templates(q)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Search failed"))
    return result


@router.post("/generate")
def generate_proposal(
    request: GenerateProposalRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Generate a proposal based on prompt and tone."""
    result = ProposalController.generate_proposal(
        prompt=request.prompt,
        tone=request.tone,
        template_id=request.template_id
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Generation failed"))
    return result
