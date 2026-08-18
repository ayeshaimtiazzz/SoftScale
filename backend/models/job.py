"""Job and project models."""
from pydantic import BaseModel
from typing import Optional

class PostJobRequest(BaseModel):
    """Post job request model."""
    user_id: int
    job_title: str
    job_description: str
    job_type: str
    required_experience: str
    required_skills: str
    work_mode: str
    salary: Optional[float] = None
    preferred_domain: str

class PostProjectRequest(BaseModel):
    """Post project request model."""
    user_id: int
    project_title: str
    project_description: str
    project_type: str
    payment_type: str
    work_mode: str
    required_experience: str
    required_skills: str
    team_size: Optional[int] = None
    duration: str
    domain: str
    salary: Optional[int] = None

