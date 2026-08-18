"""Job and project routes."""
from fastapi import APIRouter, Depends, Path, Query, Body
from controllers import JobController
from models import PostJobRequest, PostProjectRequest
from middleware import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["job"])

class CreateProspectRequest(BaseModel):
    talent_id: str = None
    talent_type: str = None

class ApplyToJobRequest(BaseModel):
    talent_id: str = None
    talent_type: str = None
    auto_create_deal: bool = True  # Automatically create deal for company
    generate_proposal: bool = False  # Optionally generate application proposal

@router.post("/post-job")
def post_job(request: PostJobRequest):
    """Post job endpoint."""
    return JobController.post_job(request)

@router.post("/post-project")
def post_project(request: PostProjectRequest):
    """Post project endpoint."""
    return JobController.post_project(request)

@router.get("/jobs/{job_id}/prospects")
def get_job_prospects(
    job_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Get all prospects for a job (company admin only)."""
    return JobController.get_job_prospects(job_id, user_id)

@router.get("/projects/{project_id}/prospects")
def get_project_prospects(
    project_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Get all prospects for a project (company admin only)."""
    return JobController.get_project_prospects(project_id, user_id)

@router.post("/jobs/{job_id}/pursue")
def pursue_job(
    job_id: int = Path(...),
    request: CreateProspectRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Create a job prospect (when user pursues a job)."""
    return JobController.create_job_prospect(job_id, user_id, request.talent_id, request.talent_type)

@router.post("/jobs/{job_id}/apply")
def apply_to_job(
    job_id: int = Path(...),
    request: ApplyToJobRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Apply to a job (for job seekers) with automation features."""
    return JobController.apply_to_job(job_id, user_id, request.talent_id, request.talent_type, request.auto_create_deal, request.generate_proposal)

@router.post("/projects/{project_id}/pursue")
def pursue_project(
    project_id: int = Path(...),
    request: CreateProspectRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Create a project prospect (when user pursues a project)."""
    return JobController.create_project_prospect(project_id, user_id, request.talent_id, request.talent_type)

@router.get("/user-pursuits")
def get_user_pursuits(
    role: str = Query(...),
    user_id: int = Depends(get_current_user)
):
    """Get all jobs and projects a user has pursued."""
    return JobController.get_user_pursuits(user_id, role)
