"""Repository for proposal templates and generated proposals."""
import psycopg2
from typing import List, Dict, Optional
from data.database import connect_db


class ProposalRepository:
    """Repository for proposal-related database operations."""

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
