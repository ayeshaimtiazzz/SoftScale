"""API routes for public endpoints."""
from fastapi import APIRouter, Depends, Query
from controllers import ProfileController, JobController
from middleware import get_current_user

router = APIRouter(prefix="/api", tags=["api"])

@router.get("/get-profile-id")
def get_profile_id(user_id: int = Depends(get_current_user), role: str = Query(...)):
    """Get profile ID from user_id based on role."""
    return ProfileController.get_profile_id(user_id, role)

@router.get("/get-job-seeker-profile-id")
def get_job_seeker_profile_id(user_id: int = Depends(get_current_user)):
    """Get job seeker profile ID from user_id."""
    return ProfileController.get_profile_id(user_id, "job_seeker")

@router.get("/profile/{item_id}")
def get_profile(item_id: int, type: str = Query(..., description="Type of item: 'candidate', 'job', 'project', 'freelancer', or 'company'")):
    """Get profile by ID and type."""
    return ProfileController.get_profile(item_id, type)

@router.get("/jobs")
def get_all_jobs():
    """Get all jobs."""
    return JobController.get_all_jobs()

@router.get("/projects")
def get_all_projects():
    """Get all projects."""
    return JobController.get_all_projects()

@router.get("/candidates")
def get_all_candidates():
    """Get all candidates."""
    return JobController.get_all_candidates()
