"""Profile routes."""
from fastapi import APIRouter, Depends, Form, File, UploadFile
from controllers import ProfileController
from models import CompanyProfile, UpdateCompanyProfileRequest
from middleware import get_current_user

router = APIRouter(prefix="/api", tags=["profile"])

@router.post("/create-company-profile")
def create_company_profile(profile: CompanyProfile):
    """Create company profile endpoint."""
    return ProfileController.create_company_profile(profile)


@router.put("/update-company-profile")
def update_company_profile(
    data: UpdateCompanyProfileRequest,
    user_id: int = Depends(get_current_user),
):
    """Update company profile (same fields as signup company form)."""
    return ProfileController.update_company_profile(data, user_id)

@router.post("/create-freelancer-profile")
def create_freelancer_profile(
    user_id: int = Form(...),
    full_name: str = Form(...),
    gender: str = Form(...),
    country: str = Form(None),
    city: str = Form(None),
    date_of_birth: str = Form(None),
    email: str = Form(...),
    phone_number: str = Form(...),
    linkedin_url: str = Form(None),
    degree: str = Form(None),
    graduation_year: int = Form(None),
    experience_year: int = Form(None),
    experience_level: str = Form(...),
    professional_summary: str = Form(None),
    certifications: str = Form(None),
    portfolio: str = Form(None),
    skills: str = Form(None),
    domain: str = Form(...),
    work_preference: str = Form(...),
    availability: str = Form(...),
    hourly_rate: float = Form(None),
    projects: str = Form(...),
    resume_file: UploadFile = File(None)
):
    """Create freelancer profile endpoint."""
    return ProfileController.create_freelancer_profile(
        user_id=user_id, full_name=full_name, gender=gender, country=country,
        city=city, date_of_birth=date_of_birth, email=email, phone_number=phone_number,
        linkedin_url=linkedin_url, degree=degree, graduation_year=graduation_year,
        experience_year=experience_year, experience_level=experience_level,
        professional_summary=professional_summary, certifications=certifications,
        portfolio=portfolio, skills=skills, domain=domain, work_preference=work_preference,
        availability=availability, hourly_rate=hourly_rate, projects=projects,
        resume_file=resume_file
    )

@router.post("/create-job-seeker-profile")
def create_job_seeker_profile(
    user_id: int = Form(...),
    full_name: str = Form(...),
    gender: str = Form(...),
    country: str = Form(None),
    city: str = Form(None),
    date_of_birth: str = Form(None),
    phone_number: str = Form(...),
    email: str = Form(...),
    linkedin_url: str = Form(None),
    education: str = Form(...),
    degree: str = Form(None),
    graduation_year: int = Form(None),
    university: str = Form(None),
    skills: str = Form(None),
    career_objective: str = Form(None),
    domain: str = Form(...),
    contact_info: str = Form(None),
    expected_salary: float = Form(None),
    job_type: str = Form(...),
    experience_level: str = Form(...),
    past_jobs: str = Form(...),
    resume_file: UploadFile = File(None)
):
    """Create job seeker profile endpoint."""
    return ProfileController.create_job_seeker_profile(
        user_id=user_id, full_name=full_name, gender=gender, country=country,
        city=city, date_of_birth=date_of_birth, phone_number=phone_number, email=email,
        linkedin_url=linkedin_url, education=education, degree=degree,
        graduation_year=graduation_year, university=university, skills=skills,
        career_objective=career_objective, domain=domain, contact_info=contact_info,
        expected_salary=expected_salary, job_type=job_type, experience_level=experience_level,
        past_jobs=past_jobs, resume_file=resume_file
    )

@router.get("/get-company-posts")
def get_company_posts(user_id: int = Depends(get_current_user)):
    """Get company posts endpoint."""
    return ProfileController.get_company_posts(user_id)
