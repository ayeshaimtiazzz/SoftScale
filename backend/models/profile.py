"""Profile models."""
from pydantic import BaseModel
from typing import Optional

class CompanyProfile(BaseModel):
    """Company profile model."""
    user_id: int
    company_name: str
    company_description: str
    country: Optional[str] = None
    city: Optional[str] = None
    company_size: Optional[str] = None
    domain: str


class UpdateCompanyProfileRequest(BaseModel):
    """Update company profile (authenticated user; same fields as signup company form)."""
    company_name: str
    company_description: str
    country: Optional[str] = None
    city: Optional[str] = None
    company_size: Optional[str] = None
    domain: str

class FreelancerProfile(BaseModel):
    """Freelancer profile model."""
    user_id: int
    full_name: str
    gender: str
    country: Optional[str] = None
    city: Optional[str] = None
    date_of_birth: Optional[str] = None
    email: str
    phone_number: str
    linkedin_url: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    experience_year: Optional[int] = None
    experience_level: str
    professional_summary: Optional[str] = None
    certifications: Optional[str] = None
    portfolio: Optional[str] = None
    skills: Optional[str] = None
    domain: str
    work_preference: str
    availability: str
    hourly_rate: Optional[float] = None
    projects: str

