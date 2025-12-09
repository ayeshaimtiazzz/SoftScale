"""Job and project service."""
from typing import Dict, Any, List
from data import get_db, JobRepository, ProfileRepository, ProspectRepository
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

    @staticmethod
    def get_available_projects_for_deals(user_id: int) -> list:
        """Get available projects that a company admin can pursue as deals (excluding their own projects)."""
        conn = get_db()
        try:
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                # Return empty list instead of raising error - company might not have created profile yet
                return []

            return JobRepository.get_available_projects_for_deals(conn, company_id)
        except Exception as e:
            # Log error but return empty list to prevent dashboard hang
            print(f"Error fetching available projects for deals: {e}")
            return []
        finally:
            conn.close()

    @staticmethod
    def get_job_prospects(job_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Get all prospects for a job (company admin only)."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            # Verify user owns the job
            job = JobRepository.get_job_by_id(conn, job_id)
            if not job:
                raise ValueError("Job not found")

            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id or job['company_id'] != company_id:
                raise ValueError("Unauthorized")

            return ProspectRepository.get_job_prospects(conn, job_id)
        finally:
            conn.close()

    @staticmethod
    def get_project_prospects(project_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Get all prospects for a project (company admin only)."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            # Verify user owns the project
            project = JobRepository.get_project_by_id(conn, project_id)
            if not project:
                raise ValueError("Project not found")

            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id or project['company_id'] != company_id:
                raise ValueError("Unauthorized")

            return ProspectRepository.get_project_prospects(conn, project_id)
        finally:
            conn.close()

    @staticmethod
    def create_job_prospect(job_id: int, user_id: int, talent_id: str = None, talent_type: str = None) -> Dict[str, Any]:
        """Create a job prospect (when user pursues a job)."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            prospect_id = ProspectRepository.create_job_prospect(conn, job_id, user_id, talent_id, talent_type)
            return {"success": True, "prospect_id": prospect_id, "message": "Job prospect created"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def create_project_prospect(project_id: int, user_id: int, talent_id: str = None, talent_type: str = None) -> Dict[str, Any]:
        """Create a project prospect (when user pursues a project)."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            prospect_id = ProspectRepository.create_project_prospect(conn, project_id, user_id, talent_id, talent_type)
            return {"success": True, "prospect_id": prospect_id, "message": "Project prospect created"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_user_pursuits(user_id: int, role: str) -> Dict[str, Any]:
        """Get all jobs and projects a user has pursued."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            job_prospects = ProspectRepository.get_user_job_prospects(conn, user_id)
            project_prospects = ProspectRepository.get_user_project_prospects(conn, user_id)

            # Get talent_id based on role
            talent_id = None
            if role == "freelancer":
                with conn.cursor() as cur:
                    cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s LIMIT 1", (user_id,))
                    result = cur.fetchone()
                    if result:
                        talent_id = str(result[0])
            elif role in ("job_seeker", "jobseeker"):
                with conn.cursor() as cur:
                    cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s LIMIT 1", (user_id,))
                    result = cur.fetchone()
                    if result:
                        talent_id = str(result[0])

            return {
                "success": True,
                "job_prospects": job_prospects,
                "project_prospects": project_prospects,
                "talent_id": talent_id
            }
        finally:
            conn.close()

