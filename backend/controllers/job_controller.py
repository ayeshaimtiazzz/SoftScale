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

    @staticmethod
    def get_available_projects_for_deals(user_id: int):
        """Get available projects for company admin to pursue as deals."""
        try:
            return JobService.get_available_projects_for_deals(user_id)
        except Exception as e:
            # Return empty list instead of error to prevent dashboard hang
            print(f"Error in get_available_projects_for_deals: {e}")
            return []

    @staticmethod
    def get_job_prospects(job_id: int, user_id: int):
        """Get all prospects for a job."""
        try:
            prospects = JobService.get_job_prospects(job_id, user_id)
            return {"success": True, "prospects": prospects}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_project_prospects(project_id: int, user_id: int):
        """Get all prospects for a project."""
        try:
            prospects = JobService.get_project_prospects(project_id, user_id)
            return {"success": True, "prospects": prospects}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def create_job_prospect(job_id: int, user_id: int, talent_id: str = None, talent_type: str = None):
        """Create a job prospect."""
        try:
            return JobService.create_job_prospect(job_id, user_id, talent_id, talent_type)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def create_project_prospect(project_id: int, user_id: int, talent_id: str = None, talent_type: str = None):
        """Create a project prospect."""
        try:
            return JobService.create_project_prospect(project_id, user_id, talent_id, talent_type)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_user_pursuits(user_id: int, role: str):
        """Get all jobs and projects a user has pursued."""
        try:
            return JobService.get_user_pursuits(user_id, role)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def apply_to_job(job_id: int, user_id: int, talent_id: str = None, talent_type: str = None, auto_create_deal: bool = True, generate_proposal: bool = False):
        """Apply to a job with automation features."""
        try:
            return JobService.apply_to_job(job_id, user_id, talent_id, talent_type, auto_create_deal, generate_proposal)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

