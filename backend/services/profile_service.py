"""Profile service."""
from datetime import datetime
from typing import Dict, Any
from data import get_db, ProfileRepository
from data.database import insert_dynamic
from utils.embeddings import generate_and_store_embedding_from_profile, generate_and_store_skill_embedding
from utils.text_processing import extract_text_from_upload
from config import settings

class ProfileService:
    """Service for profile operations."""
    
    @staticmethod
    def create_company_profile(user_id: int, company_name: str, company_description: str,
                               country: str = None, city: str = None, company_size: str = None,
                               domain: str = None) -> Dict[str, Any]:
        """Create company profile."""
        conn = get_db()
        try:
            # Insert into company table
            insert_dynamic(conn, "company", {
                "user_id": user_id,
                "company_name": company_name,
                "company_description": company_description,
                "country": country,
                "city": city,
                "company_size": company_size,
                "domain": domain,
            })
            
            # Get the inserted company_id
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            
            # Generate and store profile embedding
            generate_and_store_embedding_from_profile(company_id, "company", conn, settings.EMBEDDINGS_DIR)
            
            conn.commit()
            return {"message": "Company profile created successfully", "company_id": company_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
    
    @staticmethod
    def create_freelancer_profile(user_id: int, full_name: str, gender: str, country: str = None,
                                  city: str = None, date_of_birth: str = None, email: str = None,
                                  phone_number: str = None, linkedin_url: str = None, degree: str = None,
                                  graduation_year: int = None, experience_year: int = None,
                                  experience_level: str = None, professional_summary: str = None,
                                  certifications: str = None, portfolio: str = None, skills: str = None,
                                  domain: str = None, work_preference: str = None, availability: str = None,
                                  hourly_rate: float = None, projects: str = None,
                                  resume_file_content: bytes = None, resume_content_type: str = None) -> Dict[str, Any]:
        """Create freelancer profile."""
        conn = get_db()
        try:
            # Query database to get actual enum values for availability_enum
            db_enum_values = []
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT enumlabel 
                        FROM pg_enum 
                        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'availability_enum') 
                        ORDER BY enumsortorder;
                    """)
                    db_enum_values = [row[0] for row in cur.fetchall()]
            except Exception:
                pass  # Column might be VARCHAR, not ENUM
            
            # Map availability from frontend format to database enum format
            availability_db = None
            if db_enum_values:
                availability_lower = availability.lower() if availability else ""
                for db_value in db_enum_values:
                    db_value_lower = db_value.lower()
                    if db_value_lower == availability_lower:
                        availability_db = db_value
                        break
                    if availability_lower == "full-time" and ("full" in db_value_lower or "time" in db_value_lower):
                        availability_db = db_value
                        break
                    if availability_lower == "part-time" and ("part" in db_value_lower or "time" in db_value_lower):
                        availability_db = db_value
                        break
                    if availability_lower == "freelance" and "freelance" in db_value_lower:
                        availability_db = db_value
                        break
                    if availability_lower == "not available" and ("not" in db_value_lower or "available" in db_value_lower):
                        availability_db = db_value
                        break
            
            if not availability_db:
                availability_mapping = {
                    "full-time": "full-time",
                    "part-time": "part-time",
                    "freelance": "freelance",
                    "not available": "not_available"
                }
                availability_db = availability_mapping.get(availability, availability) if availability else None
                
                if db_enum_values and availability_db:
                    availability_lower = availability_db.lower()
                    for db_value in db_enum_values:
                        if availability_lower in db_value.lower() or db_value.lower() in availability_lower:
                            availability_db = db_value
                            break
            
            if db_enum_values and availability_db and availability_db not in db_enum_values:
                availability_db_lower = availability_db.lower()
                for db_value in db_enum_values:
                    if db_value.lower() == availability_db_lower:
                        availability_db = db_value
                        break
                else:
                    if db_enum_values:
                        availability_db = db_enum_values[0]
            
            # Validate and sanitize linkedin_url
            linkedin_url_validated = None
            if linkedin_url:
                linkedin_url = linkedin_url.strip()
                if linkedin_url.startswith(('http://', 'https://')):
                    linkedin_url_validated = linkedin_url
                elif linkedin_url.startswith('www.'):
                    linkedin_url_validated = f"https://{linkedin_url}"
                elif 'linkedin.com' in linkedin_url.lower():
                    linkedin_url_validated = f"https://{linkedin_url}"
            
            # Map work_preference
            work_preference_mapping = {
                "on-site": "on_site",
                "remote": "remote",
                "hybrid": "hybrid"
            }
            work_preference_db = work_preference_mapping.get(work_preference, work_preference.replace("-", "_") if work_preference else None)
            
            # Prepare data
            data = {
                "user_id": user_id,
                "full_name": full_name,
                "gender": gender,
                "country": country,
                "city": city,
                "date_of_birth": datetime.strptime(date_of_birth, "%Y-%m-%d").date() if date_of_birth else None,
                "email": email,
                "phone_number": phone_number,
                "linkedin_url": linkedin_url_validated,
                "degree": degree,
                "graduation_year": graduation_year,
                "experience_year": experience_year,
                "experience_level": experience_level,
                "professional_summary": professional_summary,
                "certifications": certifications,
                "portfolio": portfolio,
                "skills": skills,
                "domain": domain,
                "work_preference": work_preference_db,
                "availability": availability_db,  # Use mapped value for database enum
                "hourly_rate": hourly_rate,
                "projects": projects,
            }
            
            # Insert into freelancer table
            insert_dynamic(conn, "freelancer", data)
            
            # Handle resume text extraction
            if resume_file_content and resume_content_type:
                resume_text = extract_text_from_upload(resume_file_content, resume_content_type)
                if resume_text:
                    ProfileRepository.update_resume_text(conn, "freelancer", user_id, resume_text)
            
            # Get the inserted freelancer_id
            freelancer_id = ProfileRepository.get_freelancer_by_user_id(conn, user_id)
            
            # Generate and store embeddings
            generate_and_store_embedding_from_profile(freelancer_id, "freelancer", conn, settings.EMBEDDINGS_DIR)
            generate_and_store_skill_embedding(freelancer_id, "freelancer", conn)
            
            conn.commit()
            return {"message": "Freelancer profile created successfully", "freelancer_id": freelancer_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
    
    @staticmethod
    def create_job_seeker_profile(user_id: int, full_name: str, gender: str, country: str = None,
                                  city: str = None, date_of_birth: str = None, phone_number: str = None,
                                  email: str = None, linkedin_url: str = None, education: str = None,
                                  degree: str = None, graduation_year: int = None, university: str = None,
                                  skills: str = None, career_objective: str = None, domain: str = None,
                                  contact_info: str = None, expected_salary: float = None,
                                  job_type: str = None, experience_level: str = None, past_jobs: str = None,
                                  resume_file_content: bytes = None, resume_content_type: str = None) -> Dict[str, Any]:
        """Create job seeker profile."""
        conn = get_db()
        try:
            # Query database to get actual enum values for job_type_enum
            db_job_type_enum_values = []
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT enumlabel 
                        FROM pg_enum 
                        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_type_enum') 
                        ORDER BY enumsortorder;
                    """)
                    db_job_type_enum_values = [row[0] for row in cur.fetchall()]
            except Exception:
                pass  # Column might be VARCHAR, not ENUM
            
            # Map job_type from frontend format to database enum format
            job_type_db = None
            if db_job_type_enum_values and job_type:
                job_type_lower = job_type.lower()
                for db_value in db_job_type_enum_values:
                    db_value_lower = db_value.lower()
                    if db_value_lower == job_type_lower:
                        job_type_db = db_value
                        break
                    if job_type_lower == "permanent" and ("full" in db_value_lower or "permanent" in db_value_lower):
                        job_type_db = db_value
                        break
                    if job_type_lower == "freelance" and ("part" in db_value_lower or "freelance" in db_value_lower):
                        job_type_db = db_value
                        break
                    if job_type_lower == "contract" and "contract" in db_value_lower:
                        job_type_db = db_value
                        break
                    if job_type_lower == "internship" and "internship" in db_value_lower:
                        job_type_db = db_value
                        break
            
            if not job_type_db and job_type:
                job_type_mapping = {
                    "permanent": "full-time",
                    "contract": "contract",
                    "freelance": "part-time",
                    "internship": "internship"
                }
                job_type_db = job_type_mapping.get(job_type, job_type)
                
                if db_job_type_enum_values:
                    job_type_lower = job_type_db.lower()
                    for db_value in db_job_type_enum_values:
                        if job_type_lower in db_value.lower() or db_value.lower() in job_type_lower:
                            job_type_db = db_value
                            break
            
            if db_job_type_enum_values and job_type_db and job_type_db not in db_job_type_enum_values:
                job_type_db_lower = job_type_db.lower()
                for db_value in db_job_type_enum_values:
                    if db_value.lower() == job_type_db_lower:
                        job_type_db = db_value
                        break
                else:
                    if db_job_type_enum_values:
                        job_type_db = db_job_type_enum_values[0]
            
            # Validate and sanitize linkedin_url
            linkedin_url_validated = None
            if linkedin_url:
                linkedin_url = linkedin_url.strip()
                if linkedin_url.startswith(('http://', 'https://')):
                    linkedin_url_validated = linkedin_url
                elif linkedin_url.startswith('www.'):
                    linkedin_url_validated = f"https://{linkedin_url}"
                elif 'linkedin.com' in linkedin_url.lower():
                    linkedin_url_validated = f"https://{linkedin_url}"
            
            # Prepare data
            data = {
                "user_id": user_id,
                "full_name": full_name,
                "gender": gender,
                "country": country,
                "city": city,
                "date_of_birth": datetime.strptime(date_of_birth, "%Y-%m-%d").date() if date_of_birth else None,
                "phone_number": phone_number,
                "email": email,
                "linkedin_url": linkedin_url_validated,
                "education": education,
                "degree": degree,
                "graduation_year": graduation_year,
                "university": university,
                "skills": skills,
                "career_objective": career_objective,
                "domain": domain,
                "contact_info": contact_info,
                "expected_salary": expected_salary,
                "job_type": job_type_db,  # Use mapped value for database enum
                "experience_level": experience_level,
                "past_jobs": past_jobs,
            }
            
            # Insert into job_seeker table
            insert_dynamic(conn, "job_seeker", data)
            
            # Handle resume text extraction
            if resume_file_content and resume_content_type:
                resume_text = extract_text_from_upload(resume_file_content, resume_content_type)
                if resume_text:
                    ProfileRepository.update_resume_text(conn, "job_seeker", user_id, resume_text)
            
            # Get the inserted candidate_id
            candidate_id = ProfileRepository.get_job_seeker_by_user_id(conn, user_id)
            
            # Generate and store embeddings
            generate_and_store_embedding_from_profile(candidate_id, "job_seeker", conn, settings.EMBEDDINGS_DIR)
            generate_and_store_skill_embedding(candidate_id, "job_seeker", conn)
            
            conn.commit()
            return {"message": "Job Seeker profile created successfully", "candidate_id": candidate_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
    
    @staticmethod
    def get_profile(item_id: int, item_type: str) -> Dict[str, Any]:
        """Get profile by ID and type."""
        conn = get_db()
        try:
            record = ProfileRepository.get_profile_by_id(conn, item_id, item_type)
            if not record:
                raise ValueError(f"No record found for {item_type} with ID {item_id}")
            return {"type": item_type, "data": record}
        finally:
            conn.close()
    
    @staticmethod
    def get_profile_id(user_id: int, role: str) -> Dict[str, Any]:
        """Get profile ID from user_id based on role."""
        conn = get_db()
        try:
            if role == "freelancer":
                profile_id = ProfileRepository.get_freelancer_by_user_id(conn, user_id)
                if not profile_id:
                    raise ValueError("Freelancer profile not found")
                return {"profile_id": profile_id}
            elif role in ("company", "company_admin"):
                profile_id = ProfileRepository.get_company_by_user_id(conn, user_id)
                if not profile_id:
                    raise ValueError("Company profile not found")
                return {"profile_id": profile_id}
            else:
                raise ValueError("Invalid role specified")
        finally:
            conn.close()
    
    @staticmethod
    def get_company_posts(user_id: int) -> Dict[str, Any]:
        """Get all jobs and projects for a company."""
        conn = get_db()
        try:
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                raise ValueError("Company profile not found")
            
            posts = ProfileRepository.get_company_posts(conn, company_id)
            result = [{"type": row[0], "id": row[1], "title": row[2], "domain": row[3]} for row in posts]
            return {"posts": result}
        finally:
            conn.close()
