"""Proposal generation routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from fastapi.responses import Response, StreamingResponse
from typing import Optional, Dict, Any
from pydantic import BaseModel
from controllers.proposal_controller import ProposalController
from middleware import get_current_user
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools
import os
from io import BytesIO

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
    custom_options: Optional[Dict[str, Any]] = None  # Custom options to highlight (e.g., {"pricing": ["Basic", "Premium"]})


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
    """Get the status of the proposal generator model (merged model preferred)."""
    try:
        from ai.proposal_generator.merged.merged_proposal_generator import get_merged_proposal_generator
        from services.proposal_generator_service import ProposalGeneratorService
        from config import settings
        import os

        # Check merged model (preferred - faster loading)
        merged_generator = get_merged_proposal_generator()
        merged_model_path = settings.PROPOSAL_MERGED_MODEL_PATH
        merged_path_exists = os.path.exists(merged_model_path)
        merged_config_exists = os.path.exists(os.path.join(merged_model_path, "config.json")) if merged_path_exists else False

        # Check old adapter model (fallback)
        adapter_service = ProposalGeneratorService()
        adapter_model_path = adapter_service._get_model_path()
        adapter_path_exists = os.path.exists(adapter_model_path)
        adapter_config_exists = os.path.exists(os.path.join(adapter_model_path, "adapter_config.json")) if adapter_path_exists else False
        adapter_model_exists = os.path.exists(os.path.join(adapter_model_path, "adapter_model.safetensors")) if adapter_path_exists else False

        # Check dependencies
        try:
            import torch
            import transformers
            dependencies_ok = True
            dependencies_error = None
            peft_available = True
            try:
                import peft
            except ImportError:
                peft_available = False
        except ImportError as e:
            dependencies_ok = False
            dependencies_error = str(e)
            peft_available = False

        # Determine which model is actually being used
        merged_available = merged_generator.is_available()
        merged_loading = merged_generator.is_loading()
        adapter_available = adapter_service.is_available() if hasattr(adapter_service, 'is_available') else False

        # Primary model status (merged is preferred)
        primary_available = merged_available
        primary_loading = merged_loading
        primary_model_type = "merged" if merged_available or merged_loading else "adapter"

        return {
            "success": True,
            "model_available": primary_available,
            "model_loaded": primary_available,
            "model_loading": primary_loading,
            "primary_model_type": primary_model_type,
            "merged_model": {
                "available": merged_available,
                "loading": merged_loading,
                "path": merged_model_path,
                "path_exists": merged_path_exists,
                "config_exists": merged_config_exists,
            },
            "adapter_model": {
                "available": adapter_available,
                "path": adapter_model_path,
                "path_exists": adapter_path_exists,
                "adapter_config_exists": adapter_config_exists,
                "adapter_model_exists": adapter_model_exists,
            },
            "dependencies": {
                "installed": dependencies_ok,
                "peft_available": peft_available,
                "error": dependencies_error,
            },
            "message": f"{primary_model_type.capitalize()} model is ready" if primary_available else (
                f"{primary_model_type.capitalize()} model is loading..." if primary_loading else
                "No model available - check paths and dependencies above"
            )
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "model_available": False
        }


@router.post("/generate")
async def generate_proposal(
    request: GenerateProposalRequest = Body(...),
    user_id: int = Depends(get_current_user),
    use_jupyter: bool = Query(False, description="Use Jupyter container for generation (alternative method)")
):
    """Generate a proposal based on prompt and tone."""

    # Jupyter generation logic commented out - using merged model instead
    # Option to use Jupyter for generation
    # if use_jupyter:
    #     print("[API] Using Jupyter for proposal generation (requested via parameter)")
    #     try:
    #         from services.jupyter_proposal_service import JupyterProposalService
    #         result = JupyterProposalService.generate_proposal_via_jupyter(
    #             prompt=request.prompt,
    #             tone=request.tone,
    #             max_tokens=300  # Reduced for CPU
    #         )
    #         if result.get("success"):
    #             return {
    #                 "success": True,
    #                 "proposal": result.get("proposal", ""),
    #                 "tone": request.tone,
    #                 "template_id": request.template_id,
    #                 "page_count": request.page_count,
    #                 "cover_page": request.cover_page,
    #                 "detail_level": request.detail_level,
    #                 "note": f"Generated via Jupyter (device: {result.get('device', 'unknown')})"
    #             }
    #         else:
    #             print(f"[API] Jupyter generation failed: {result.get('error')}")
    #             # Fall through to regular generation
    #     except Exception as jupyter_error:
    #         print(f"[API] Error using Jupyter: {jupyter_error}")
    #         # Fall through to regular generation

    # Demo mode is enabled by default - proposals generate instantly without model loading
    # No need to check model status - ProposalService handles demo mode automatically

    # Wrapper function to call the controller
    def _generate_wrapper(prompt, tone, template_id, page_count, cover_page, detail_level, custom_options):
        try:
            return ProposalController.generate_proposal(
                prompt, tone, template_id, page_count, cover_page, detail_level, custom_options
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
                request.detail_level,
                request.custom_options
            ),
            timeout=10.0  # 10 seconds - demo mode is fast, but allow some buffer
        )
        if not result.get("success", False):
            # Even if generation failed, return the result (might have fallback)
            return result
        return result
    except asyncio.TimeoutError:
        print("[API] Generation timed out (should not happen with demo mode)")
        # With demo mode, this should rarely happen, but handle it gracefully
        raise HTTPException(
            status_code=504,
            detail="Proposal generation timed out. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error in generate_proposal endpoint: {e}")
        import traceback
        traceback.print_exc()
        # With demo mode enabled, errors should be rare - report them properly
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.post("/download")
async def download_proposal(
    request: Dict[str, Any] = Body(...),
    format: str = Query("txt", description="Download format: txt, docx"),
    user_id: int = Depends(get_current_user)
):
    """Download a proposal in various formats (txt, docx)."""
    try:
        proposal_html = request.get("proposal", "")
        if not proposal_html:
            raise HTTPException(status_code=400, detail="Proposal content is required")

        format_lower = format.lower()

        if format_lower == "docx":
            # Export to DOCX
            try:
                from ai.proposal_generator.merged.docx_export import export_to_docx
                docx_buffer = export_to_docx(
                    proposal_html,
                    project_title=request.get("project_title"),
                    sender_name=request.get("sender_name"),
                    submission_date=request.get("submission_date")
                )

                return StreamingResponse(
                    BytesIO(docx_buffer.read()),
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={
                        "Content-Disposition": f'attachment; filename="proposal_{Date.now()}.docx"'
                    }
                )
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="DOCX export requires python-docx. Install with: pip install python-docx"
                )

        elif format_lower == "txt":
            # Export to plain text (markdown-style)
            from ai.proposal_generator.merged.utils import strip_html_tags
            text_content = strip_html_tags(proposal_html)

            # Convert to markdown-style
            import re
            # Convert headings
            text_content = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n', text_content, flags=re.IGNORECASE | re.DOTALL)
            text_content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1\n', text_content, flags=re.IGNORECASE | re.DOTALL)
            # Convert paragraphs
            text_content = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n', text_content, flags=re.IGNORECASE | re.DOTALL)
            # Convert lists
            text_content = re.sub(r'<ul[^>]*>', '', text_content, flags=re.IGNORECASE)
            text_content = re.sub(r'</ul>', '\n', text_content, flags=re.IGNORECASE)
            text_content = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', text_content, flags=re.IGNORECASE | re.DOTALL)
            # Remove remaining tags
            text_content = re.sub(r'<[^>]+>', '', text_content)
            # Clean up whitespace
            text_content = re.sub(r'\n{3,}', '\n\n', text_content)
            text_content = text_content.strip()

            return Response(
                content=text_content,
                media_type="text/plain; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="proposal_{int(__import__("time").time())}.txt"'
                }
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}. Use 'txt' or 'docx'")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error downloading proposal: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to download proposal: {str(e)}")


class GenerateProposalFromDealRequest(BaseModel):
    """Request model for generating proposal from deal."""
    deal_id: int
    tone: str = "Professional"
    template_id: Optional[int] = None
    page_count: Optional[str] = None
    cover_page: Optional[str] = "without"
    detail_level: Optional[str] = "detailed"
    save_to_deal: bool = True  # Whether to save proposal and link to deal
    custom_options: Optional[Dict[str, Any]] = None  # Custom options to highlight


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
    custom_options: Optional[Dict[str, Any]] = None  # Custom options to highlight


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
            save_to_deal=request.save_to_deal,
            custom_options=request.custom_options
        )

    try:
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _generate_wrapper),
            timeout=10.0  # Demo mode is fast, reduced timeout
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
            create_deal=request.create_deal,
            custom_options=request.custom_options
        )

    try:
        # Demo mode enabled - generation is fast, reduced timeout to 10 seconds
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _generate_wrapper),
            timeout=10.0
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


class SaveProposalToDealRequest(BaseModel):
    """Request model for saving proposal to deal."""
    deal_id: int
    proposal_content: str
    tone: str = "Professional"
    template_id: Optional[int] = None
    page_count: Optional[str] = None
    cover_page: Optional[str] = "without"
    detail_level: Optional[str] = "detailed"


@router.post("/save-to-deal")
async def save_proposal_to_deal(
    request: SaveProposalToDealRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Save an existing proposal content to a deal."""
    result = ProposalController.save_proposal_to_deal(
        user_id=user_id,
        deal_id=request.deal_id,
        proposal_content=request.proposal_content,
        tone=request.tone,
        template_id=request.template_id,
        page_count=request.page_count,
        cover_page=request.cover_page,
        detail_level=request.detail_level
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to save proposal to deal"))
    return result
