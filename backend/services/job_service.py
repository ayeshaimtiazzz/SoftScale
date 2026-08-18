"""Job and project service."""
from typing import Dict, Any, List, Optional
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
        """Get all prospects for a job. Accessible to job owners and users who have pursued the job."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            # Verify job exists
            job = JobRepository.get_job_by_id(conn, job_id)
            if not job:
                raise ValueError("Job not found")

            # Check if user owns the job (company admin)
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            is_owner = company_id and job['company_id'] == company_id

            # Check if user has pursued this job (freelancer/job seeker)
            user_prospects = ProspectRepository.get_user_job_prospects(conn, user_id)
            has_pursued = any(p.get('job_id') == job_id for p in user_prospects)

            # Allow access if user owns the job OR has pursued it
            if not is_owner and not has_pursued:
                raise ValueError("Unauthorized: You must own this job or have pursued it to view prospects")

            return ProspectRepository.get_job_prospects(conn, job_id)
        finally:
            conn.close()

    @staticmethod
    def get_project_prospects(project_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Get all prospects for a project. Accessible to project owners and users who have pursued the project."""
        conn = get_db()
        try:
            ProspectRepository.ensure_prospects_tables(conn)
            # Verify project exists
            project = JobRepository.get_project_by_id(conn, project_id)
            if not project:
                raise ValueError("Project not found")

            # Check if user owns the project (company admin)
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            is_owner = company_id and project['company_id'] == company_id

            # Check if user has pursued this project (freelancer)
            user_prospects = ProspectRepository.get_user_project_prospects(conn, user_id)
            has_pursued = any(p.get('project_id') == project_id for p in user_prospects)

            # Allow access if user owns the project OR has pursued it
            if not is_owner and not has_pursued:
                raise ValueError("Unauthorized: You must own this project or have pursued it to view prospects")

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

    @staticmethod
    def apply_to_job(job_id: int, user_id: int, talent_id: str = None, talent_type: str = None,
                     auto_create_deal: bool = True, generate_proposal: bool = False) -> Dict[str, Any]:
        """Apply to a job (for job seekers) with automation features.

        Automation features:
        1. Creates job prospect (application record)
        2. Auto-creates deal for company admin (if enabled)
        3. Optionally generates application proposal/cover letter
        4. Updates prospect status to 'applied'
        """
        conn = get_db()
        try:
            # Get job details
            job = JobRepository.get_job_by_id(conn, job_id)
            if not job:
                raise ValueError("Job not found")

            # Get job seeker details
            if not talent_id or not talent_type:
                with conn.cursor() as cur:
                    cur.execute("SELECT candidate_id, full_name FROM job_seeker WHERE user_id = %s LIMIT 1", (user_id,))
                    result = cur.fetchone()
                    if not result:
                        raise ValueError("Job seeker profile not found. Please complete your profile first.")
                    talent_id = str(result[0])
                    talent_name = result[1] or "Job Seeker"
                    talent_type = "job_seeker"
            else:
                # Get talent name
                with conn.cursor() as cur:
                    cur.execute("SELECT full_name FROM job_seeker WHERE candidate_id = %s LIMIT 1", (talent_id,))
                    result = cur.fetchone()
                    talent_name = result[0] if result and result[0] else "Job Seeker"

            # Ensure prospects table exists
            ProspectRepository.ensure_prospects_tables(conn)

            # Create job prospect with 'applied' status
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO job_prospects (job_id, user_id, talent_id, talent_type, status)
                    VALUES (%s, %s, %s, %s, 'applied')
                    ON CONFLICT (job_id, user_id) DO UPDATE SET
                        status = 'applied',
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING prospect_id
                """, (job_id, user_id, talent_id, talent_type))
                prospect_id = cur.fetchone()[0]

            result = {
                "success": True,
                "prospect_id": prospect_id,
                "message": "Application submitted successfully!"
            }

            # Automation: Auto-create deal for company admin
            if auto_create_deal:
                try:
                    from services.deal_service import DealService
                    from data import ProfileRepository as PR

                    # Get company admin user_id from job
                    company_id = job.get('company_id')
                    if company_id:
                        with conn.cursor() as cur:
                            cur.execute("SELECT user_id FROM company WHERE company_id = %s LIMIT 1", (company_id,))
                            company_user = cur.fetchone()
                            if company_user:
                                company_user_id = company_user[0]

                                # Get company name
                                cur.execute("SELECT company_name FROM company WHERE company_id = %s LIMIT 1", (company_id,))
                                company_result = cur.fetchone()
                                company_name = company_result[0] if company_result else "Company"

                                # Create deal for company admin
                                deal_data = {
                                    "deal_title": f"Application from {talent_name} - {job.get('job_title', 'Job')}",
                                    "talent_name": talent_name,
                                    "talent_id": talent_id,
                                    "company_name": company_name,
                                    "stage": "Prospecting",
                                    "status": "active",
                                    "value": float(job.get('salary', 0)) if job.get('salary') else None,
                                    "description": f"Job application from {talent_name} for position: {job.get('job_title', 'Job')}",
                                    "tags": [job.get('preferred_domain', 'General'), "Job Application", job.get('job_type', 'Not Specified')],
                                    "lead_source": "job_application",
                                    "related_job_id": job_id,
                                    "skills": job.get('required_skills', ''),
                                    "experience": job.get('required_experience', ''),
                                    "work_model": job.get('work_mode', ''),
                                }

                                from data.deal_repository import DealRepository
                                DealRepository.ensure_deals_table(conn)
                                deal_id = DealRepository.create_deal(conn, company_user_id, deal_data)
                                result["deal_id"] = deal_id
                                result["message"] += f" Deal created for company admin."
                except Exception as deal_error:
                    print(f"Warning: Failed to auto-create deal: {deal_error}")
                    # Don't fail the application if deal creation fails

            # Automation: Generate application proposal/cover letter (optional)
            if generate_proposal:
                try:
                    from services.proposal_service import ProposalService
                    from services.proposal_prompt_helper import build_candidate_info_from_match

                    # Get job seeker skills and experience
                    with conn.cursor() as cur:
                        cur.execute("SELECT skills, experience_level, career_objective FROM job_seeker WHERE candidate_id = %s LIMIT 1", (talent_id,))
                        js_result = cur.fetchone()
                        js_skills = js_result[0] if js_result and js_result[0] else ""
                        js_experience = js_result[1] if js_result and js_result[1] else ""

                    # Build candidate info
                    candidate_info = build_candidate_info_from_match(
                        talent_name=talent_name,
                        talent_id=talent_id,
                        skills=js_skills,
                        experience=js_experience
                    )

                    # Build job info
                    job_info = {
                        "job_title": job.get('job_title', ''),
                        "job_description": job.get('job_description', ''),
                        "company_name": company_name if 'company_name' in locals() else "Company",
                        "required_skills": job.get('required_skills', ''),
                        "required_experience": job.get('required_experience', ''),
                    }

                    # Generate proposal as an application/cover letter
                    prompt = f"Write a professional job application cover letter for {job.get('job_title', 'this position')} at {job_info.get('company_name', 'the company')}."

                    proposal_content = ProposalService.generate_proposal(
                        prompt=prompt,
                        tone="Professional",
                        candidate_info=candidate_info,
                        project_info=job_info
                    )

                    result["proposal_generated"] = True
                    result["proposal_preview"] = proposal_content[:200] + "..." if len(proposal_content) > 200 else proposal_content
                except Exception as proposal_error:
                    print(f"Warning: Failed to generate proposal: {proposal_error}")
                    # Don't fail the application if proposal generation fails

            conn.commit()
            return result
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

