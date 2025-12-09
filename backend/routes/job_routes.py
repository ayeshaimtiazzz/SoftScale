"""Job and project routes."""
from fastapi import APIRouter
from controllers import JobController
from models import PostJobRequest, PostProjectRequest

router = APIRouter(prefix="/api", tags=["job"])

@router.post("/post-job")
def post_job(request: PostJobRequest):
    """Post job endpoint."""
    return JobController.post_job(request)

@router.post("/post-project")
def post_project(request: PostProjectRequest):
    """Post project endpoint."""
    return JobController.post_project(request)
