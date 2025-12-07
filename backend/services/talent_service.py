"""Talent matching service."""
from typing import Dict, Any, Optional
from data import get_db, UserRepository, ProfileRepository, JobRepository
from utils.talent_matching import perform_talent_match

# Define allowed filter values
ALLOWED_SALARY_RANGES = ["0 - 500", "500 - 1,000", "1,000 - 2,000", "2,000 - 5,000", "5,000+"]
ALLOWED_EXPERIENCE_LEVELS = ["beginner", "intermediate", "expert"]
ALLOWED_JOB_TYPES = ["full-time", "part-time", "contract", "internship"]
ALLOWED_PROJECT_TYPES = ["short-term", "long-term", "General", "milestone"]
ALLOWED_WORK_MODES = ["remote", "hybrid", "on-site"]

class TalentService:
    """Service for talent matching operations."""
    
    @staticmethod
    def match_talent(user_id: int, post_id: Optional[int] = None, top_k: int = 10,
                     salary_range: Optional[str] = None, experience_level: Optional[str] = None,
                     job_type: Optional[str] = None, project_type: Optional[str] = None,
                     work_mode: Optional[str] = None, country: Optional[str] = None,
                     city: Optional[str] = None) -> Dict[str, Any]:
        """Perform talent matching."""
        conn = get_db()
        try:
            # Get user role
            role = UserRepository.get_user_role(conn, user_id)
            if not role:
                raise ValueError("User not found")
            
            # Normalize role name
            if role == "jobseeker":
                role = "job_seeker"
            
            if role not in ["freelancer", "job_seeker", "company_admin"]:
                raise ValueError(f"Invalid role for talent match: {role}")
            
            # Role-based setup
            if role == "company_admin":
                if not post_id:
                    raise ValueError("post_id required for company admins")
                
                # Check ownership and determine type
                company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
                if not company_id:
                    raise ValueError("Company profile not found")
                
                # Check if post exists and get type
                is_job = JobRepository.check_post_ownership(conn, post_id, company_id, "job")
                is_project = JobRepository.check_post_ownership(conn, post_id, company_id, "project")
                
                if not is_job and not is_project:
                    raise ValueError("Post not found or not owned by you")
                
                post_type = "job" if is_job else "project"
                
                # Set source/target
                source_table = "job" if post_type == "job" else "projects"
                source_pk = "job_id" if post_type == "job" else "project_id"
                target_table = "job_seeker" if post_type == "job" else "freelancer"
                source_text_cols = ["job_title", "job_description", "preferred_domain"] if post_type == "job" else ["project_title", "project_description", "domain"]
                target_text_cols = ["career_objective", "resume_text", "domain"] if target_table == "job_seeker" else ["professional_summary", "resume_text", "domain"]
                domain_col = "preferred_domain" if post_type == "job" else "domain"
                
                # Fetch source row
                with conn.cursor() as cur:
                    cur.execute(f"SELECT * FROM {source_table} WHERE {source_pk} = %s", (post_id,))
                    source_row = cur.fetchone()
                    source_cols = [d[0] for d in cur.description]
            
            else:  # freelancer or job_seeker
                # Map role to table name
                if role == "freelancer":
                    source_table = "freelancer"
                elif role == "job_seeker":
                    source_table = "job_seeker"
                else:
                    raise ValueError(f"Invalid role: {role}")
                
                target_table = "projects" if role == "freelancer" else "job"
                source_text_cols = ["professional_summary", "resume_text", "domain"] if role == "freelancer" else ["career_objective", "resume_text", "domain"]
                target_text_cols = ["project_title", "project_description", "domain"] if target_table == "projects" else ["job_title", "job_description", "preferred_domain"]
                domain_col = "domain" if target_table == "projects" else "preferred_domain"
                
                # Fetch source row
                with conn.cursor() as cur:
                    cur.execute(f"SELECT * FROM {source_table} WHERE user_id = %s", (user_id,))
                    source_row = cur.fetchone()
                    if not source_row:
                        raise ValueError(f"Profile not found for {role}. Please complete your profile first.")
                    source_cols = [d[0] for d in cur.description]
            
            # Prepare and validate filters
            filters = {}
            filter_keys = []
            if salary_range and salary_range in ALLOWED_SALARY_RANGES:
                filters["salary_range"] = salary_range
                filter_keys.append("salary_range")
            if experience_level and experience_level.lower() in ALLOWED_EXPERIENCE_LEVELS:
                filters["experience_level"] = experience_level.lower()
                filter_keys.append("experience_level")
            if job_type and target_table == "job" and job_type.lower() in ALLOWED_JOB_TYPES:
                filters["type"] = job_type.lower()
                filter_keys.append("type")
            if project_type and target_table == "projects" and project_type.lower() in ALLOWED_PROJECT_TYPES:
                filters["type"] = project_type.lower()
                filter_keys.append("type")
            if work_mode and work_mode.lower() in ALLOWED_WORK_MODES:
                filters["work_mode"] = work_mode.lower()
                filter_keys.append("work_mode")
            if country:
                filters["country"] = country
                filter_keys.append("country")
            if city:
                filters["city"] = city
                filter_keys.append("city")
            
            # Perform match
            matches = perform_talent_match(conn, source_table, target_table, source_row, source_cols, source_text_cols, target_text_cols, domain_col, filters, filter_keys, top_k)
            
            return {"matches": matches}
        finally:
            conn.close()
