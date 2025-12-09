"""Dashboard service for metrics and statistics."""
from typing import Dict, Any
from data import get_db, ProfileRepository, JobRepository, UserRepository

class DashboardService:
    """Service for dashboard operations."""

    @staticmethod
    def get_dashboard_metrics(user_id: int, role: str) -> Dict[str, Any]:
        """Get dashboard metrics based on user role."""
        conn = get_db()
        try:
            if role in ("company_admin", "company"):
                return DashboardService._get_company_metrics(conn, user_id)
            elif role == "freelancer":
                return DashboardService._get_freelancer_metrics(conn, user_id)
            elif role in ("job_seeker", "jobseeker"):
                return DashboardService._get_job_seeker_metrics(conn, user_id)
            else:
                return {"error": "Invalid role"}
        finally:
            conn.close()

    @staticmethod
    def _get_company_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for company admin."""
        with conn.cursor() as cur:
            # Get company_id
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                return {
                    "activeCandidates": 0,
                    "activeJobs": 0,
                    "activeProjects": 0,
                    "totalPosts": 0
                }

            # Count active candidates (job seekers + freelancers)
            cur.execute("""
                SELECT COUNT(*) FROM (
                    SELECT candidate_id FROM job_seeker
                    UNION ALL
                    SELECT freelancer_id FROM freelancer
                ) AS candidates
            """)
            active_candidates = cur.fetchone()[0] or 0

            # Count company's jobs
            cur.execute("SELECT COUNT(*) FROM job WHERE company_id = %s", (company_id,))
            active_jobs = cur.fetchone()[0] or 0

            # Count company's projects
            cur.execute("SELECT COUNT(*) FROM projects WHERE company_id = %s", (company_id,))
            active_projects = cur.fetchone()[0] or 0

            total_posts = active_jobs + active_projects

            return {
                "activeCandidates": active_candidates,
                "activeJobs": active_jobs,
                "activeProjects": active_projects,
                "totalPosts": total_posts
            }

    @staticmethod
    def _get_freelancer_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for freelancer."""
        with conn.cursor() as cur:
            # Get freelancer_id
            freelancer_id = ProfileRepository.get_freelancer_by_user_id(conn, user_id)
            if not freelancer_id:
                return {
                    "availableJobs": 0,
                    "availableProjects": 0,
                    "totalOpportunities": 0,
                    "profileViews": 0
                }

            # Count available jobs
            cur.execute("SELECT COUNT(*) FROM job")
            available_jobs = cur.fetchone()[0] or 0

            # Count available projects
            cur.execute("SELECT COUNT(*) FROM projects")
            available_projects = cur.fetchone()[0] or 0

            total_opportunities = available_jobs + available_projects

            return {
                "availableJobs": available_jobs,
                "availableProjects": available_projects,
                "totalOpportunities": total_opportunities,
                "profileViews": 0  # Placeholder for future implementation
            }

    @staticmethod
    def _get_job_seeker_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for job seeker."""
        with conn.cursor() as cur:
            # Get candidate_id
            candidate_id = ProfileRepository.get_job_seeker_by_user_id(conn, user_id)
            if not candidate_id:
                return {
                    "availableJobs": 0,
                    "appliedJobs": 0,
                    "savedJobs": 0,
                    "profileViews": 0
                }

            # Count available jobs
            cur.execute("SELECT COUNT(*) FROM job")
            available_jobs = cur.fetchone()[0] or 0

            return {
                "availableJobs": available_jobs,
                "appliedJobs": 0,  # Placeholder for future implementation
                "savedJobs": 0,  # Placeholder for future implementation
                "profileViews": 0  # Placeholder for future implementation
            }


