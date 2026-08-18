"""Talent matching routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from controllers import TalentController
from middleware import get_current_user

router = APIRouter(prefix="/api", tags=["talent"])

@router.get("/talent-match")
def talent_match(
    post_id: Optional[int] = None,
    top_k: int = 10,
    salary_range: Optional[str] = None,
    experience_level: Optional[str] = None,
    job_type: Optional[str] = None,
    project_type: Optional[str] = None,
    work_mode: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    user_id: int = Depends(get_current_user)
):
    """Talent match endpoint."""
    return TalentController.match_talent(
        user_id, post_id, top_k, salary_range, experience_level,
        job_type, project_type, work_mode, country, city
    )
