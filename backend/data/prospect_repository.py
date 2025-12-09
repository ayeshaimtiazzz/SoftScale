"""Prospect repository for tracking job/project prospects."""
import psycopg2
from typing import List, Dict, Any, Optional

class ProspectRepository:
    """Repository for prospect operations."""

    @staticmethod
    def ensure_prospects_tables(conn):
        """Ensure prospect tables exist."""
        with conn.cursor() as cur:
            # Job prospects table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS job_prospects (
                    prospect_id SERIAL PRIMARY KEY,
                    job_id INTEGER REFERENCES job(job_id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    talent_id VARCHAR(100),
                    talent_type VARCHAR(50),
                    status VARCHAR(50) DEFAULT 'interested',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(job_id, user_id)
                )
            """)

            # Project prospects table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS project_prospects (
                    prospect_id SERIAL PRIMARY KEY,
                    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    talent_id VARCHAR(100),
                    talent_type VARCHAR(50),
                    status VARCHAR(50) DEFAULT 'interested',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(project_id, user_id)
                )
            """)

            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_job_prospects_job_id ON job_prospects(job_id);
                CREATE INDEX IF NOT EXISTS idx_job_prospects_user_id ON job_prospects(user_id);
                CREATE INDEX IF NOT EXISTS idx_project_prospects_project_id ON project_prospects(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_prospects_user_id ON project_prospects(user_id);
            """)
            conn.commit()

    @staticmethod
    def create_job_prospect(conn, job_id: int, user_id: int, talent_id: str = None, talent_type: str = None) -> int:
        """Create a job prospect."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO job_prospects (job_id, user_id, talent_id, talent_type)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (job_id, user_id) DO UPDATE SET
                    updated_at = CURRENT_TIMESTAMP
                RETURNING prospect_id
            """, (job_id, user_id, talent_id, talent_type))
            prospect_id = cur.fetchone()[0]
            conn.commit()
            return prospect_id

    @staticmethod
    def create_project_prospect(conn, project_id: int, user_id: int, talent_id: str = None, talent_type: str = None) -> int:
        """Create a project prospect."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO project_prospects (project_id, user_id, talent_id, talent_type)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (project_id, user_id) DO UPDATE SET
                    updated_at = CURRENT_TIMESTAMP
                RETURNING prospect_id
            """, (project_id, user_id, talent_id, talent_type))
            prospect_id = cur.fetchone()[0]
            conn.commit()
            return prospect_id

    @staticmethod
    def get_job_prospects(conn, job_id: int) -> List[Dict[str, Any]]:
        """Get all prospects for a job."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    jp.*,
                    u.name as user_name,
                    u.email as user_email,
                    CASE
                        WHEN jp.talent_type = 'freelancer' THEN f.full_name
                        WHEN jp.talent_type = 'job_seeker' THEN js.full_name
                        ELSE NULL
                    END as talent_name
                FROM job_prospects jp
                LEFT JOIN users u ON jp.user_id = u.user_id
                LEFT JOIN freelancer f ON jp.talent_id::text = f.freelancer_id::text AND jp.talent_type = 'freelancer'
                LEFT JOIN job_seeker js ON jp.talent_id::text = js.candidate_id::text AND jp.talent_type = 'job_seeker'
                WHERE jp.job_id = %s
                ORDER BY jp.created_at DESC
            """, (job_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            prospects = []

            for row in rows:
                prospect = dict(zip(colnames, row))
                if prospect.get('created_at'):
                    prospect['created_at'] = prospect['created_at'].isoformat()
                if prospect.get('updated_at'):
                    prospect['updated_at'] = prospect['updated_at'].isoformat()
                prospects.append(prospect)

            return prospects

    @staticmethod
    def get_project_prospects(conn, project_id: int) -> List[Dict[str, Any]]:
        """Get all prospects for a project."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    pp.*,
                    u.name as user_name,
                    u.email as user_email,
                    CASE
                        WHEN pp.talent_type = 'freelancer' THEN f.full_name
                        WHEN pp.talent_type = 'job_seeker' THEN js.full_name
                        ELSE NULL
                    END as talent_name
                FROM project_prospects pp
                LEFT JOIN users u ON pp.user_id = u.user_id
                LEFT JOIN freelancer f ON pp.talent_id::text = f.freelancer_id::text AND pp.talent_type = 'freelancer'
                LEFT JOIN job_seeker js ON pp.talent_id::text = js.candidate_id::text AND pp.talent_type = 'job_seeker'
                WHERE pp.project_id = %s
                ORDER BY pp.created_at DESC
            """, (project_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            prospects = []

            for row in rows:
                prospect = dict(zip(colnames, row))
                if prospect.get('created_at'):
                    prospect['created_at'] = prospect['created_at'].isoformat()
                if prospect.get('updated_at'):
                    prospect['updated_at'] = prospect['updated_at'].isoformat()
                prospects.append(prospect)

            return prospects

    @staticmethod
    def get_user_job_prospects(conn, user_id: int) -> List[Dict[str, Any]]:
        """Get all jobs a user has pursued."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    jp.*,
                    j.job_title,
                    j.job_description,
                    j.job_type,
                    j.salary,
                    c.company_name,
                    c.company_id
                FROM job_prospects jp
                JOIN job j ON jp.job_id = j.job_id
                JOIN company c ON j.company_id = c.company_id
                WHERE jp.user_id = %s
                ORDER BY jp.created_at DESC
            """, (user_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            prospects = []

            for row in rows:
                prospect = dict(zip(colnames, row))
                if prospect.get('created_at'):
                    prospect['created_at'] = prospect['created_at'].isoformat()
                if prospect.get('updated_at'):
                    prospect['updated_at'] = prospect['updated_at'].isoformat()
                prospects.append(prospect)

            return prospects

    @staticmethod
    def get_user_project_prospects(conn, user_id: int) -> List[Dict[str, Any]]:
        """Get all projects a user has pursued."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    pp.*,
                    p.project_title,
                    p.project_description,
                    p.project_type,
                    p.salary,
                    c.company_name,
                    c.company_id
                FROM project_prospects pp
                JOIN projects p ON pp.project_id = p.project_id
                JOIN company c ON p.company_id = c.company_id
                WHERE pp.user_id = %s
                ORDER BY pp.created_at DESC
            """, (user_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            prospects = []

            for row in rows:
                prospect = dict(zip(colnames, row))
                if prospect.get('created_at'):
                    prospect['created_at'] = prospect['created_at'].isoformat()
                if prospect.get('updated_at'):
                    prospect['updated_at'] = prospect['updated_at'].isoformat()
                prospects.append(prospect)

            return prospects

