"""Profile controller."""
from fastapi import HTTPException, status, UploadFile
from services import ProfileService
from models import CompanyProfile

class ProfileController:
    """Controller for profile endpoints."""
    
    @staticmethod
    def create_company_profile(profile: CompanyProfile):
        """Create company profile."""
        try:
            return ProfileService.create_company_profile(
                profile.user_id, profile.company_name, profile.company_description,
                profile.country, profile.city, profile.company_size, profile.domain
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def create_freelancer_profile(
        user_id: int, full_name: str, gender: str,
        country: str = None, city: str = None, date_of_birth: str = None,
        email: str = None, phone_number: str = None, linkedin_url: str = None,
        degree: str = None, graduation_year: int = None, experience_year: int = None,
        experience_level: str = None, professional_summary: str = None,
        certifications: str = None, portfolio: str = None, skills: str = None,
        domain: str = None, work_preference: str = None, availability: str = None,
        hourly_rate: float = None, projects: str = None,
        resume_file: UploadFile = None
    ):
        """Create freelancer profile."""
        try:
            resume_content = None
            resume_content_type = None
            if resume_file:
                resume_content = resume_file.file.read()
                resume_content_type = resume_file.content_type
            
            return ProfileService.create_freelancer_profile(
                user_id, full_name, gender, country, city, date_of_birth, email,
                phone_number, linkedin_url, degree, graduation_year, experience_year,
                experience_level, professional_summary, certifications, portfolio,
                skills, domain, work_preference, availability, hourly_rate, projects,
                resume_content, resume_content_type
            )
        except ValueError as e:
            error_msg = str(e)
            # Parse error to return field-specific messages
            if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
                if "availability_enum" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select a valid availability option.")
                elif "work_preference" in error_msg or "work_mode" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select a valid work preference option.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid selection. Please check your form inputs.")
            elif "check constraint" in error_msg.lower():
                if "linkedin_url" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LinkedIn URL must be a valid URL (starting with http:// or https://) or left empty.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input format. Please check your entries.")
            elif "not null" in error_msg.lower() or "null value" in error_msg.lower():
                if "email" in error_msg.lower():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")
                elif "phone" in error_msg.lower():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Required fields are missing.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred. Please try again.")
    
    @staticmethod
    def create_job_seeker_profile(
        user_id: int, full_name: str, gender: str,
        country: str = None, city: str = None, date_of_birth: str = None,
        phone_number: str = None, email: str = None, linkedin_url: str = None,
        education: str = None, degree: str = None, graduation_year: int = None,
        university: str = None, skills: str = None, career_objective: str = None,
        domain: str = None, contact_info: str = None, expected_salary: float = None,
        job_type: str = None, experience_level: str = None, past_jobs: str = None,
        resume_file: UploadFile = None
    ):
        """Create job seeker profile."""
        try:
            resume_content = None
            resume_content_type = None
            if resume_file:
                resume_content = resume_file.file.read()
                resume_content_type = resume_file.content_type
            
            return ProfileService.create_job_seeker_profile(
                user_id, full_name, gender, country, city, date_of_birth, phone_number,
                email, linkedin_url, education, degree, graduation_year, university,
                skills, career_objective, domain, contact_info, expected_salary,
                job_type, experience_level, past_jobs, resume_content, resume_content_type
            )
        except ValueError as e:
            error_msg = str(e)
            # Parse error to return field-specific messages
            if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
                if "job_type_enum" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select a valid job type option.")
                elif "availability_enum" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select a valid availability option.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid selection. Please check your form inputs.")
            elif "check constraint" in error_msg.lower():
                if "linkedin_url" in error_msg:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LinkedIn URL must be a valid URL (starting with http:// or https://) or left empty.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input format. Please check your entries.")
            elif "not null" in error_msg.lower() or "null value" in error_msg.lower():
                if "email" in error_msg.lower():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")
                elif "phone" in error_msg.lower():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required.")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Required fields are missing.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred. Please try again.")
    
    @staticmethod
    def get_profile(item_id: int, item_type: str):
        """Get profile by ID and type."""
        try:
            return ProfileService.get_profile(item_id, item_type)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_profile_id(user_id: int, role: str):
        """Get profile ID from user_id based on role."""
        try:
            return ProfileService.get_profile_id(user_id, role)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    @staticmethod
    def get_company_posts(user_id: int):
        """Get all jobs and projects for a company."""
        try:
            return ProfileService.get_company_posts(user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
