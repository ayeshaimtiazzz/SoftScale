"""Repository for proposal templates and generated proposals."""
import psycopg2
from typing import List, Dict, Optional, Any
from data.database import connect_db
import json


class ProposalRepository:
    """Repository for proposal-related database operations."""

    @staticmethod
    def ensure_proposals_table(conn):
        """Ensure proposals table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS proposals (
                    proposal_id SERIAL PRIMARY KEY,
                    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    company_id INTEGER REFERENCES company(company_id) ON DELETE SET NULL,

                    -- Proposal Information
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,

                    -- Proposal Metadata
                    version INTEGER DEFAULT 1,
                    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected, archived

                    -- Related Entities
                    talent_id VARCHAR(100),
                    talent_name VARCHAR(255),

                    -- Related Job/Project (if generated from match)
                    related_job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
                    related_project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

                    -- Proposal Generation Context
                    match_score DECIMAL(5, 2),
                    template_id INTEGER,
                    tone VARCHAR(50) DEFAULT 'Professional',

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sent_at TIMESTAMP,
                    accepted_at TIMESTAMP,
                    rejected_at TIMESTAMP,

                    -- Additional Metadata
                    metadata JSONB
                )
            """)

            # Create proposal_versions table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS proposal_versions (
                    version_id SERIAL PRIMARY KEY,
                    proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    version_number INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
                    change_notes TEXT
                )
            """)

            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_proposals_deal_id ON proposals(deal_id);
                CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
                CREATE INDEX IF NOT EXISTS idx_proposals_company_id ON proposals(company_id);
                CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
                CREATE INDEX IF NOT EXISTS idx_proposals_talent_id ON proposals(talent_id);
                CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);
                CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);
            """)

            # Add latest_proposal_id to deals table if not exists
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='deals' AND column_name='latest_proposal_id'
                    ) THEN
                        ALTER TABLE deals ADD COLUMN latest_proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE SET NULL;
                        CREATE INDEX IF NOT EXISTS idx_deals_latest_proposal_id ON deals(latest_proposal_id);
                    END IF;
                END $$;
            """)

            conn.commit()

    @staticmethod
    def create_proposal(conn, user_id: int, proposal_data: Dict[str, Any]) -> int:
        """Create a new proposal and return proposal_id."""
        with conn.cursor() as cur:
            # Get company_id if user is a company
            company_id = None
            cur.execute("SELECT company_id FROM company WHERE user_id = %s LIMIT 1", (user_id,))
            result = cur.fetchone()
            if result:
                company_id = result[0]

            # Insert proposal
            cur.execute("""
                INSERT INTO proposals (
                    deal_id, user_id, company_id, title, content, version, status,
                    talent_id, talent_name, related_job_id, related_project_id,
                    match_score, template_id, tone, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING proposal_id
            """, (
                proposal_data.get('deal_id'),
                user_id,
                company_id,
                proposal_data.get('title'),
                proposal_data.get('content'),
                proposal_data.get('version', 1),
                proposal_data.get('status', 'draft'),
                proposal_data.get('talent_id'),
                proposal_data.get('talent_name'),
                proposal_data.get('related_job_id'),
                proposal_data.get('related_project_id'),
                proposal_data.get('match_score'),
                proposal_data.get('template_id'),
                proposal_data.get('tone', 'Professional'),
                json.dumps(proposal_data.get('metadata')) if proposal_data.get('metadata') else None
            ))

            proposal_id = cur.fetchone()[0]

            # Update deal's latest_proposal_id if deal_id is provided
            if proposal_data.get('deal_id'):
                cur.execute("""
                    UPDATE deals
                    SET latest_proposal_id = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE deal_id = %s
                """, (proposal_id, proposal_data.get('deal_id')))

            # If status is 'sent', update sent_at timestamp
            if proposal_data.get('status') == 'sent':
                cur.execute("""
                    UPDATE proposals
                    SET sent_at = CURRENT_TIMESTAMP
                    WHERE proposal_id = %s
                """, (proposal_id,))

            conn.commit()
            return proposal_id

    @staticmethod
    def get_proposal_by_id(conn, proposal_id: int, user_id: int = None) -> Optional[Dict[str, Any]]:
        """Get proposal by ID, optionally filtered by user_id."""
        with conn.cursor() as cur:
            if user_id:
                cur.execute("""
                    SELECT * FROM proposals
                    WHERE proposal_id = %s AND user_id = %s
                """, (proposal_id, user_id))
            else:
                cur.execute("SELECT * FROM proposals WHERE proposal_id = %s", (proposal_id,))

            row = cur.fetchone()
            if not row:
                return None

            colnames = [desc[0] for desc in cur.description]
            proposal = dict(zip(colnames, row))

            # Format dates
            for date_field in ['created_at', 'updated_at', 'sent_at', 'accepted_at', 'rejected_at']:
                if proposal.get(date_field):
                    proposal[date_field] = proposal[date_field].isoformat()

            # Parse metadata JSONB
            if proposal.get('metadata') and isinstance(proposal['metadata'], str):
                try:
                    proposal['metadata'] = json.loads(proposal['metadata'])
                except:
                    proposal['metadata'] = {}

            return proposal

    @staticmethod
    def get_proposals_by_deal(conn, deal_id: int, user_id: int = None) -> List[Dict[str, Any]]:
        """Get all proposals for a deal."""
        with conn.cursor() as cur:
            if user_id:
                cur.execute("""
                    SELECT * FROM proposals
                    WHERE deal_id = %s AND user_id = %s
                    ORDER BY created_at DESC
                """, (deal_id, user_id))
            else:
                cur.execute("""
                    SELECT * FROM proposals
                    WHERE deal_id = %s
                    ORDER BY created_at DESC
                """, (deal_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            proposals = []

            for row in rows:
                proposal = dict(zip(colnames, row))

                # Format dates
                for date_field in ['created_at', 'updated_at', 'sent_at', 'accepted_at', 'rejected_at']:
                    if proposal.get(date_field):
                        proposal[date_field] = proposal[date_field].isoformat()

                # Parse metadata JSONB
                if proposal.get('metadata') and isinstance(proposal['metadata'], str):
                    try:
                        proposal['metadata'] = json.loads(proposal['metadata'])
                    except:
                        proposal['metadata'] = {}

                proposals.append(proposal)

            return proposals

    @staticmethod
    def update_proposal_status(conn, proposal_id: int, user_id: int, status: str) -> bool:
        """Update proposal status and related timestamps."""
        with conn.cursor() as cur:
            updates = ["status = %s", "updated_at = CURRENT_TIMESTAMP"]
            values = [status]

            # Update timestamp based on status
            if status == 'sent':
                updates.append("sent_at = CURRENT_TIMESTAMP")
            elif status == 'accepted':
                updates.append("accepted_at = CURRENT_TIMESTAMP")
            elif status == 'rejected':
                updates.append("rejected_at = CURRENT_TIMESTAMP")

            values.extend([proposal_id, user_id])

            query = f"""
                UPDATE proposals
                SET {', '.join(updates)}
                WHERE proposal_id = %s AND user_id = %s
            """

            cur.execute(query, values)

            # If status is 'sent' and proposal has deal_id, update deal stage
            if status == 'sent':
                cur.execute("""
                    UPDATE deals
                    SET stage = 'Proposal Sent', updated_at = CURRENT_TIMESTAMP
                    WHERE deal_id = (SELECT deal_id FROM proposals WHERE proposal_id = %s)
                """, (proposal_id,))

            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def get_all_templates(
        category: Optional[str] = None,
        domain: Optional[str] = None,
        is_active: bool = True
    ) -> List[Dict]:
        """Get all proposal templates with optional filters."""
        conn = connect_db()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT
                        template_id, title, category, description, prompt,
                        content, tags, domain, tone, complexity, source_file, metadata
                    FROM proposal_templates
                    WHERE is_active = %s
                """
                params = [is_active]

                if category:
                    query += " AND category = %s"
                    params.append(category)

                if domain:
                    query += " AND domain = %s"
                    params.append(domain)

                query += " ORDER BY title ASC"

                cur.execute(query, params)
                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    result = dict(zip(columns, row))
                    # Convert tags array to list if it's not already
                    if isinstance(result.get("tags"), str):
                        result["tags"] = result["tags"].strip("{}").split(",") if result["tags"] else []
                    results.append(result)
                return results
        finally:
            conn.close()

    @staticmethod
    def get_template_by_id(template_id: int) -> Optional[Dict]:
        """Get a specific template by ID."""
        conn = connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        template_id, title, category, description, prompt,
                        content, tags, domain, tone, complexity, source_file, metadata
                    FROM proposal_templates
                    WHERE template_id = %s AND is_active = TRUE
                """, (template_id,))

                row = cur.fetchone()
                if row:
                    columns = [desc[0] for desc in cur.description]
                    result = dict(zip(columns, row))
                    if isinstance(result.get("tags"), str):
                        result["tags"] = result["tags"].strip("{}").split(",") if result["tags"] else []
                    return result
                return None
        finally:
            conn.close()

    @staticmethod
    def get_categories() -> List[str]:
        """Get all unique categories."""
        conn = connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT category
                    FROM proposal_templates
                    WHERE is_active = TRUE AND category IS NOT NULL
                    ORDER BY category ASC
                """)
                return [row[0] for row in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_domains() -> List[str]:
        """Get all unique domains."""
        conn = connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT domain
                    FROM proposal_templates
                    WHERE is_active = TRUE AND domain IS NOT NULL
                    ORDER BY domain ASC
                """)
                return [row[0] for row in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def search_templates(query: str, limit: int = 20) -> List[Dict]:
        """Search templates by title, description, or tags."""
        conn = connect_db()
        try:
            with conn.cursor() as cur:
                search_term = f"%{query.lower()}%"
                cur.execute("""
                    SELECT
                        template_id, title, category, description, prompt,
                        content, tags, domain, tone, complexity, source_file, metadata
                    FROM proposal_templates
                    WHERE is_active = TRUE
                    AND (
                        LOWER(title) LIKE %s
                        OR LOWER(description) LIKE %s
                        OR EXISTS (
                            SELECT 1 FROM unnest(tags) AS tag
                            WHERE LOWER(tag) LIKE %s
                        )
                    )
                    ORDER BY title ASC
                    LIMIT %s
                """, (search_term, search_term, search_term, limit))

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    result = dict(zip(columns, row))
                    if isinstance(result.get("tags"), str):
                        result["tags"] = result["tags"].strip("{}").split(",") if result["tags"] else []
                    results.append(result)
                return results
        finally:
            conn.close()

