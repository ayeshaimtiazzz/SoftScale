"""Profile data repository."""
import psycopg2
from psycopg2 import sql
from typing import Optional, Dict, Any

class ProfileRepository:
    """Repository for profile-related database operations."""
    
    @staticmethod
    def get_company_by_user_id(conn, user_id: int) -> Optional[int]:
        """Get company_id by user_id."""
        with conn.cursor() as cur:
            cur.execute("SELECT company_id FROM company WHERE user_id = %s", (user_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def get_freelancer_by_user_id(conn, user_id: int) -> Optional[int]:
        """Get freelancer_id by user_id."""
        with conn.cursor() as cur:
            cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s ORDER BY freelancer_id DESC LIMIT 1", (user_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def get_job_seeker_by_user_id(conn, user_id: int) -> Optional[int]:
        """Get candidate_id by user_id."""
        with conn.cursor() as cur:
            cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s ORDER BY candidate_id DESC LIMIT 1", (user_id,))
            result = cur.fetchone()
            return result[0] if result else None
    
    @staticmethod
    def get_profile_by_id(conn, item_id: int, item_type: str) -> Optional[Dict[str, Any]]:
        """Get profile by ID and type."""
        table_map = {
            "candidate": "job_seeker",
            "job_seeker": "job_seeker",
            "freelancer": "freelancer",
            "company": "company",
            "job": "job",
            "project": "projects"
        }
        
        table = table_map.get(item_type)
        if not table:
            return None
        
        pk_map = {
            "job_seeker": "candidate_id",
            "freelancer": "freelancer_id",
            "company": "company_id",
            "job": "job_id",
            "projects": "project_id"
        }
        
        pk_col = pk_map.get(table)
        if not pk_col:
            return None
        
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM {table} WHERE {pk_col} = %s", (item_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            colnames = [desc[0] for desc in cur.description]
            record = dict(zip(colnames, row))
            
            # Remove specified fields
            fields_to_remove = ['created_at', 'skill_embedding', 'embedding_vector_id', 
                              'candidate_id', 'freelancer_id', 'company_id', 'job_id', 'project_id']
            for field in fields_to_remove:
                record.pop(field, None)
            
            return record
    
    @staticmethod
    def update_resume_text(conn, table_name: str, user_id: int, resume_text: str):
        """Update resume text for a profile."""
        with conn.cursor() as cur:
            cur.execute(sql.SQL("UPDATE {} SET resume_text = %s WHERE user_id = %s").format(
                sql.Identifier(table_name)), (resume_text, user_id))
            conn.commit()
    
    @staticmethod
    def get_company_posts(conn, company_id: int) -> list:
        """Get all jobs and projects for a company."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 'job' AS type, job_id AS id, job_title AS title, preferred_domain AS domain
                FROM job WHERE company_id = %s
                UNION ALL
                SELECT 'projects' AS type, project_id AS id, project_title AS title, domain
                FROM projects WHERE company_id = %s
                ORDER BY type, id;
            """, (company_id, company_id))
            return cur.fetchall()

