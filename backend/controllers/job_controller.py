"""Job and project controller."""
from fastapi import HTTPException, status
from services import JobService
from models import PostJobRequest, PostProjectRequest

class JobController:
    """Controller for job and project endpoints."""
    
    @staticmethod
    def post_job(request: PostJobRequest):
        """Post a new job."""
        try:
            return JobService.post_job(
                request.user_id, request.job_title, request.job_description,
                request.job_type, request.required_experience, request.required_skills,
                request.work_mode, request.salary, request.preferred_domain
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def post_project(request: PostProjectRequest):
        """Post a new project."""
        try:
            return JobService.post_project(
                request.user_id, request.project_title, request.project_description,
                request.project_type, request.payment_type, request.work_mode,
                request.required_experience, request.required_skills, request.team_size,
                request.duration, request.domain, request.salary
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_all_jobs():
        """Get all jobs."""
        try:
            return JobService.get_all_jobs()
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_all_projects():
        """Get all projects."""
        try:
            return JobService.get_all_projects()
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_all_candidates():
        """Get all candidates."""
        try:
            return JobService.get_all_candidates()
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

