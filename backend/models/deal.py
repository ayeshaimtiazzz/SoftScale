"""Deal models."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CreateDealRequest(BaseModel):
    """Create deal request model."""
    deal_title: str
    talent_name: str
    talent_id: Optional[str] = None
    company_name: Optional[str] = None
    stage: str = "Prospecting"  # Prospecting, Contacted, Proposal Sent, Negotiation, Closed Won, Closed Lost
    status: str = "active"  # active, pending, closed
    value: Optional[float] = None
    probability: Optional[int] = None
    expected_close_date: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    lead_source: Optional[str] = None
    match_score: Optional[float] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    location: Optional[str] = None
    work_model: Optional[str] = None
    related_job_id: Optional[int] = None
    related_project_id: Optional[int] = None

class UpdateDealRequest(BaseModel):
    """Update deal request model."""
    deal_title: Optional[str] = None
    talent_name: Optional[str] = None
    company_name: Optional[str] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    expected_close_date: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class UpdateDealStageRequest(BaseModel):
    """Update deal stage request model."""
    stage: str
