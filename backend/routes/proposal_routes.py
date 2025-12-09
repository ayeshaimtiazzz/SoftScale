"""Proposal generation routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from controllers.proposal_controller import ProposalController
from middleware import get_current_user
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools
import os

router = APIRouter(prefix="/api/proposals", tags=["proposals"])

# Create a dedicated thread pool executor for model generation
# This ensures model operations don't block the main event loop
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="proposal_gen")


@router.get("/test")
def test_proposal_route():
    """Test endpoint to verify proposal routes are registered (no auth required)."""
    return {
        "success": True,
        "message": "Proposal routes are working!",
        "routes": {
            "generate_from_deal": "/api/proposals/generate-from-deal",
            "generate_from_match": "/api/proposals/generate-from-match"
        }
    }


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
    # Quick check: if model is loading or not available, return fallback immediately
    try:
        from services.proposal_generator_service import ProposalGeneratorService
        model_service = ProposalGeneratorService()

        # Check if model is loading
        if hasattr(model_service, '_is_loading') and model_service._is_loading:
            print("[API] Model is loading, returning fallback immediately")
            result = ProposalController.generate_proposal(
                request.prompt, request.tone, request.template_id,
                request.page_count, request.cover_page, request.detail_level
            )
            return result

        # Check if model is not available (not loaded)
        if not model_service.is_available():
            print("[API] Model not available, returning fallback immediately")
            result = ProposalController.generate_proposal(
                request.prompt, request.tone, request.template_id,
                request.page_count, request.cover_page, request.detail_level
            )
            return result

    except Exception as e:
        print(f"[API] Error checking model status: {e}")
        # Continue with normal flow - will use fallback if needed

    # Wrapper function to call the controller
    def _generate_wrapper(prompt, tone, template_id, page_count, cover_page, detail_level):
        try:
            return ProposalController.generate_proposal(
                prompt, tone, template_id, page_count, cover_page, detail_level
            )
        except Exception as e:
            print(f"[API] Error in generate_wrapper: {e}")
            import traceback
            traceback.print_exc()
            # Return error response
            return {
                "success": False,
                "error": f"Generation failed: {str(e)}",
                "proposal": None
            }

    try:
        # Run blocking model generation in dedicated thread pool
        # Reduced timeout to 30 seconds to prevent hanging
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
            timeout=60.0  # 60 seconds - enough for model generation but not too long
        )
        if not result.get("success", False):
            # Even if generation failed, return the result (might have fallback)
            return result
        return result
    except asyncio.TimeoutError:
        print("[API] Generation timed out, returning fallback")
        # Return fallback response instead of error
        try:
            from services.proposal_service import ProposalService
            fallback_proposal = ProposalService._generate_fallback_proposal(
                request.prompt, request.tone
            )
            return {
                "success": True,
                "proposal": fallback_proposal,
                "tone": request.tone,
                "template_id": request.template_id,
                "page_count": request.page_count,
                "cover_page": request.cover_page,
                "detail_level": request.detail_level,
                "note": "Generation timed out after 60s - using fallback response. Model may be slow or unavailable."
            }
        except Exception as e:
            raise HTTPException(
                status_code=504,
                detail="Proposal generation timed out. Please try again later."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error in generate_proposal endpoint: {e}")
        import traceback
        traceback.print_exc()
        # Try to return fallback instead of error
        try:
            from services.proposal_service import ProposalService
            fallback_proposal = ProposalService._generate_fallback_proposal(
                request.prompt, request.tone
            )
            return {
                "success": True,
                "proposal": fallback_proposal,
                "tone": request.tone,
                "error": str(e),
                "note": "Error occurred - using fallback response"
            }
        except:
            raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


class GenerateProposalFromDealRequest(BaseModel):
    """Request model for generating proposal from deal."""
    deal_id: int
    tone: str = "Professional"
    template_id: Optional[int] = None
    page_count: Optional[str] = None
    cover_page: Optional[str] = "without"
    detail_level: Optional[str] = "detailed"
    save_to_deal: bool = True  # Whether to save proposal and link to deal


class GenerateProposalFromMatchRequest(BaseModel):
    """Request model for generating proposal from talent match."""
    talent_id: str
    talent_name: str
    match_score: Optional[float] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    job_id: Optional[int] = None
    project_id: Optional[int] = None
    job_title: Optional[str] = None
    project_title: Optional[str] = None
    job_description: Optional[str] = None
    project_description: Optional[str] = None
    company_name: Optional[str] = None
    tone: str = "Professional"
    template_id: Optional[int] = None
    page_count: Optional[str] = None
    cover_page: Optional[str] = "without"
    detail_level: Optional[str] = "detailed"
    create_deal: bool = False  # Whether to create a deal and link proposal


@router.post("/generate-from-deal")
async def generate_proposal_from_deal(
    request: GenerateProposalFromDealRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Generate a proposal from a deal with pre-filled context."""
    def _generate_wrapper():
        return ProposalController.generate_proposal_from_deal(
            user_id=user_id,
            deal_id=request.deal_id,
            tone=request.tone,
            template_id=request.template_id,
            page_count=request.page_count,
            cover_page=request.cover_page,
            detail_level=request.detail_level,
            save_to_deal=request.save_to_deal
        )

    try:
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _generate_wrapper),
            timeout=120.0
        )
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Generation failed"))
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Proposal generation timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in generate_proposal_from_deal endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.post("/generate-from-match")
async def generate_proposal_from_match(
    request: GenerateProposalFromMatchRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Generate a proposal from a talent match with pre-filled context."""
    def _generate_wrapper():
        return ProposalController.generate_proposal_from_match(
            user_id=user_id,
            talent_id=request.talent_id,
            talent_name=request.talent_name,
            match_score=request.match_score,
            skills=request.skills,
            experience=request.experience,
            job_id=request.job_id,
            project_id=request.project_id,
            job_title=request.job_title,
            project_title=request.project_title,
            job_description=request.job_description,
            project_description=request.project_description,
            company_name=request.company_name,
            tone=request.tone,
            template_id=request.template_id,
            page_count=request.page_count,
            cover_page=request.cover_page,
            detail_level=request.detail_level,
            create_deal=request.create_deal
        )

    try:
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _generate_wrapper),
            timeout=120.0
        )
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Generation failed"))
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Proposal generation timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in generate_proposal_from_match endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.get("/deals/{deal_id}/proposals")
def get_deal_proposals(
    deal_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get all proposals for a deal."""
    result = ProposalController.get_deal_proposals(deal_id, user_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Proposals not found"))
    return result


@router.post("/{proposal_id}/send")
def send_proposal(
    proposal_id: int,
    user_id: int = Depends(get_current_user)
):
    """Mark a proposal as sent and update deal stage."""
    result = ProposalController.send_proposal(proposal_id, user_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send proposal"))
    return result
