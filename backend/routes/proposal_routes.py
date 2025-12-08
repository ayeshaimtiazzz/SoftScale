"""Proposal generation routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from controllers.proposal_controller import ProposalController
from middleware.auth import get_current_user
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools
import os

router = APIRouter(prefix="/api/proposals", tags=["proposals"])

# Create a dedicated thread pool executor for model generation
# This ensures model operations don't block the main event loop
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="proposal_gen")


class GenerateProposalRequest(BaseModel):
    """Request model for proposal generation."""
    prompt: str
    tone: str = "Professional"
    template_id: Optional[int] = None
    page_count: Optional[str] = None  # "1-page", "2-page", "3-page", etc.
    cover_page: Optional[str] = "without"  # "with" or "without"
    detail_level: Optional[str] = "detailed"  # "detailed" or "summarized"


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


@router.get("/model/status")
def get_model_status(user_id: int = Depends(get_current_user)):
    """Get the status of the proposal generator model."""
    try:
        from services.proposal_generator_service import ProposalGeneratorService
        service = ProposalGeneratorService()

        return {
            "success": True,
            "model_available": service.is_available(),
            "model_loaded": service._is_loaded,
            "model_loading": getattr(service, '_is_loading', False),
            "model_path": service._get_model_path(),
            "model_exists": os.path.exists(service._get_model_path()) if hasattr(service, '_get_model_path') else False,
            "message": "Model is ready" if service.is_available() else "Model is not available - using fallback responses"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "model_available": False
        }


@router.post("/generate")
async def generate_proposal(
    request: GenerateProposalRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Generate a proposal based on prompt and tone."""
    # Wrapper function to call the controller
    def _generate_wrapper(prompt, tone, template_id, page_count, cover_page, detail_level):
        return ProposalController.generate_proposal(
            prompt, tone, template_id, page_count, cover_page, detail_level
        )

    try:
        # Run blocking model generation in dedicated thread pool
        # This prevents blocking the main event loop
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                _executor,
                _generate_wrapper,
                request.prompt,
                request.tone,
                request.template_id,
                request.page_count,
                request.cover_page,
                request.detail_level
            ),
            timeout=120.0  # 2 minute timeout
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Generation failed"))
        return result
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Proposal generation timed out. Please try again with a shorter prompt or try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in generate_proposal endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
