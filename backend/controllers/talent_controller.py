"""Talent matching controller."""
from fastapi import HTTPException, status
from typing import Optional
from services import TalentService

class TalentController:
    """Controller for talent matching endpoints."""
    
    @staticmethod
    def match_talent(user_id: int, post_id: Optional[int] = None, top_k: int = 10,
                    salary_range: Optional[str] = None, experience_level: Optional[str] = None,
                    job_type: Optional[str] = None, project_type: Optional[str] = None,
                    work_mode: Optional[str] = None, country: Optional[str] = None,
                    city: Optional[str] = None):
        """Perform talent matching."""
        try:
            return TalentService.match_talent(
                user_id, post_id, top_k, salary_range, experience_level,
                job_type, project_type, work_mode, country, city
            )
        except ValueError as e:
            error_msg = str(e)
            if "not found" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
            elif "required" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
            elif "invalid" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

