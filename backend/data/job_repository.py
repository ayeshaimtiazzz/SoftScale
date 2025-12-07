"""Job and project data repository."""
import psycopg2
from typing import List, Dict, Any, Optional

class JobRepository:
    """Repository for job and project-related database operations."""
    
    @staticmethod
    def get_job_by_id(conn, job_id: int) -> Optional[Dict[str, Any]]:
        """Get job by ID."""
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM job WHERE job_id = %s", (job_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            colnames = [desc[0] for desc in cur.description]
            return dict(zip(colnames, row))
    
    @staticmethod
    def get_project_by_id(conn, project_id: int) -> Optional[Dict[str, Any]]:
        """Get project by ID."""
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM projects WHERE project_id = %s", (project_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            colnames = [desc[0] for desc in cur.description]
            return dict(zip(colnames, row))
    
    @staticmethod
    def get_latest_job_id(conn, company_id: int) -> Optional[int]:
        """Get latest job_id for a company."""
        with conn.cursor() as cur:
            cur.execute("SELECT job_id FROM job WHERE company_id = %s ORDER BY created_at DESC LIMIT 1", (company_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def get_latest_project_id(conn, company_id: int) -> Optional[int]:
        """Get latest project_id for a company."""
        with conn.cursor() as cur:
            cur.execute("SELECT project_id FROM projects WHERE company_id = %s ORDER BY created_at DESC LIMIT 1", (company_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def get_all_jobs(conn) -> List[Dict[str, Any]]:
        """Get all jobs."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    j.job_id,
                    j.job_title AS title,
                    j.job_description,
                    j.job_type,
                    j.required_experience AS experience_level,
                    j.required_skills AS skills,
                    j.work_mode,
                    j.salary,
                    j.preferred_domain AS domain,
                    c.company_name,
                    c.country,
                    c.city
                FROM job j
                JOIN company c ON j.company_id = c.company_id
                ORDER BY j.created_at DESC
            """)
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            jobs = []
            for row in rows:
                job = dict(zip(colnames, row))
                if job.get('salary'):
                    job['salaryRange'] = f"${job['salary']:,.0f}"
                job['type'] = 'job'
                jobs.append(job)
            return jobs
    
    @staticmethod
    def get_all_projects(conn) -> List[Dict[str, Any]]:
        """Get all projects."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_title AS title,
                    p.project_description,
                    p.project_type,
                    p.payment_type,
                    p.required_experience AS experience_level,
                    p.required_skills AS skills,
                    p.work_mode,
                    p.salary,
                    p.domain,
                    p.team_size,
                    p.duration,
                    c.company_name,
                    c.country,
                    c.city
                FROM projects p
                JOIN company c ON p.company_id = c.company_id
                ORDER BY p.created_at DESC
            """)
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            projects = []
            for row in rows:
                project = dict(zip(colnames, row))
                if project.get('salary'):
                    project['salaryRange'] = f"${project['salary']:,.0f}"
                project['type'] = 'project'
                projects.append(project)
            return projects
    
    @staticmethod
    def get_all_candidates(conn) -> List[Dict[str, Any]]:
        """Get all candidates (job seekers and freelancers)."""
        candidates = []
        
        # Get job seekers
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        candidate_id AS id,
                        full_name AS name,
                        email,
                        skills,
                        experience_level AS experience,
                        country,
                        city,
                        domain,
                        expected_salary,
                        job_type
                    FROM job_seeker
                    ORDER BY created_at DESC
                """)
                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                for row in rows:
                    candidate = dict(zip(colnames, row))
                    country = candidate.get('country') or ''
                    city = candidate.get('city') or ''
                    if country and city:
                        candidate['location'] = f"{country}, {city}"
                    elif country:
                        candidate['location'] = country
                    elif city:
                        candidate['location'] = city
                    else:
                        candidate['location'] = 'Not specified'
                    
                    candidate['type'] = 'candidate'
                    if candidate.get('job_type'):
                        candidate['workModel'] = candidate['job_type']
                    
                    if candidate.get('expected_salary'):
                        try:
                            candidate['salaryRange'] = f"${float(candidate['expected_salary']):,.0f}"
                        except (ValueError, TypeError):
                            candidate['salaryRange'] = None
                    candidates.append(candidate)
        except Exception as e:
            print(f"Error fetching job seekers: {str(e)}")
        
        # Get freelancers
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        freelancer_id AS id,
                        full_name AS name,
                        email,
                        skills,
                        experience_level AS experience,
                        country,
                        city,
                        domain,
                        hourly_rate,
                        work_preference
                    FROM freelancer
                    ORDER BY created_at DESC
                """)
                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                for row in rows:
                    freelancer = dict(zip(colnames, row))
                    country = freelancer.get('country') or ''
                    city = freelancer.get('city') or ''
                    if country and city:
                        freelancer['location'] = f"{country}, {city}"
                    elif country:
                        freelancer['location'] = country
                    elif city:
                        freelancer['location'] = city
                    else:
                        freelancer['location'] = 'Not specified'
                    
                    freelancer['type'] = 'freelancer'
                    if freelancer.get('work_preference'):
                        work_pref = freelancer['work_preference']
                        if work_pref == 'on_site':
                            freelancer['workModel'] = 'on-site'
                        else:
                            freelancer['workModel'] = work_pref
                    
                    if freelancer.get('hourly_rate'):
                        try:
                            freelancer['salaryRange'] = f"${float(freelancer['hourly_rate']):,.0f}/hour"
                        except (ValueError, TypeError):
                            freelancer['salaryRange'] = None
                    candidates.append(freelancer)
        except Exception as e:
            print(f"Error fetching freelancers: {str(e)}")
        
        return candidates
    
    @staticmethod
    def check_post_ownership(conn, post_id: int, company_id: int, post_type: str) -> bool:
        """Check if a post (job/project) belongs to a company."""
        with conn.cursor() as cur:
            if post_type == "job":
                cur.execute("SELECT job_id FROM job WHERE job_id = %s AND company_id = %s", (post_id, company_id))
            else:  # project
                cur.execute("SELECT project_id FROM projects WHERE project_id = %s AND company_id = %s", (post_id, company_id))
            return cur.fetchone() is not None
