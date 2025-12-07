"""Job and project service."""
from typing import Dict, Any
from data import get_db, JobRepository, ProfileRepository
from data.database import insert_dynamic
from utils.embeddings import generate_and_store_embedding_from_profile, generate_and_store_skill_embedding
from config import settings

class JobService:
    """Service for job and project operations."""
    
    @staticmethod
    def post_job(user_id: int, job_title: str, job_description: str, job_type: str,
                 required_experience: str, required_skills: str, work_mode: str,
                 salary: float = None, preferred_domain: str = None) -> Dict[str, Any]:
        """Post a new job."""
        conn = get_db()
        try:
            # Get company_id
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                raise ValueError("Company profile not found")
            
            # Prepare data
            data = {
                "company_id": company_id,
                "job_title": job_title,
                "job_description": job_description,
                "job_type": job_type,
                "required_experience": required_experience,
                "required_skills": required_skills,
                "work_mode": work_mode,
                "salary": salary,
                "preferred_domain": preferred_domain,
            }
            
            # Insert into job table
            insert_dynamic(conn, "job", data)
            
            # Get job_id
            job_id = JobRepository.get_latest_job_id(conn, company_id)
            
            # Generate embeddings
            generate_and_store_embedding_from_profile(job_id, "job", conn, settings.EMBEDDINGS_DIR)
            generate_and_store_skill_embedding(job_id, "job", conn)
            
            conn.commit()
            return {"message": "Job posted successfully", "job_id": job_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
    
    @staticmethod
    def post_project(user_id: int, project_title: str, project_description: str,
                    project_type: str, payment_type: str, work_mode: str,
                    required_experience: str, required_skills: str, team_size: int = None,
                    duration: str = None, domain: str = None, salary: int = None) -> Dict[str, Any]:
        """Post a new project."""
        conn = get_db()
        try:
            # Get company_id
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                raise ValueError("Company profile not found")
            
            # Prepare data
            data = {
                "company_id": company_id,
                "project_title": project_title,
                "project_description": project_description,
                "project_type": project_type,
                "payment_type": payment_type,
                "work_mode": work_mode,
                "required_experience": required_experience,
                "required_skills": required_skills,
                "team_size": team_size,
                "duration": duration,
                "domain": domain,
                "salary": salary,
            }
            
            # Insert into projects table
            insert_dynamic(conn, "projects", data)
            
            # Get project_id
            project_id = JobRepository.get_latest_project_id(conn, company_id)
            
            # Generate embeddings
            generate_and_store_embedding_from_profile(project_id, "projects", conn, settings.EMBEDDINGS_DIR)
            generate_and_store_skill_embedding(project_id, "projects", conn)
            
            conn.commit()
            return {"message": "Project posted successfully", "project_id": project_id}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
    
    @staticmethod
    def get_all_jobs() -> list:
        """Get all jobs."""
        conn = get_db()
        try:
            return JobRepository.get_all_jobs(conn)
        finally:
            conn.close()
    
    @staticmethod
    def get_all_projects() -> list:
        """Get all projects."""
        conn = get_db()
        try:
            return JobRepository.get_all_projects(conn)
        finally:
            conn.close()
    
    @staticmethod
    def get_all_candidates() -> list:
        """Get all candidates."""
        conn = get_db()
        try:
            return JobRepository.get_all_candidates(conn)
        finally:
            conn.close()
