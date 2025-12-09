"""Deal data repository."""
import psycopg2
from typing import List, Dict, Any, Optional
import json

class DealRepository:
    """Repository for deal-related database operations."""

    @staticmethod
    def ensure_deals_table(conn):
        """Ensure deals table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS deals (
                    deal_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    company_id INTEGER REFERENCES company(company_id) ON DELETE SET NULL,

                    -- Deal Information
                    deal_title VARCHAR(255) NOT NULL,
                    talent_name VARCHAR(255),
                    talent_id VARCHAR(100),
                    company_name VARCHAR(255),

                    -- Deal Status
                    stage VARCHAR(50) DEFAULT 'Prospecting',
                    status VARCHAR(50) DEFAULT 'active',

                    -- Deal Value
                    value DECIMAL(12, 2),
                    probability INTEGER,

                    -- Dates
                    expected_close_date DATE,
                    closed_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Additional Information
                    description TEXT,
                    tags TEXT[],
                    lead_source VARCHAR(100),

                    -- Talent Match Data
                    match_score DECIMAL(5, 2),
                    skills TEXT,
                    experience TEXT,
                    location VARCHAR(255),
                    work_model VARCHAR(50),

                    -- Related Entities
                    related_job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
                    related_project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

                    -- AI Insights
                    ai_insights JSONB,
                    deal_health_score INTEGER,
                    recommended_actions TEXT[]
                )
            """)

            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
                CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
                CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
                CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
                CREATE INDEX IF NOT EXISTS idx_deals_talent_id ON deals(talent_id);
                CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
            """)
            conn.commit()

    @staticmethod
    def create_deal(conn, user_id: int, deal_data: Dict[str, Any]) -> int:
        """Create a new deal and return deal_id."""
        with conn.cursor() as cur:
            # Get company_id if user is a company
            company_id = None
            cur.execute("SELECT company_id FROM company WHERE user_id = %s LIMIT 1", (user_id,))
            result = cur.fetchone()
            if result:
                company_id = result[0]

            # Prepare tags array
            tags = deal_data.get('tags', [])
            if isinstance(tags, list):
                tags_array = tags
            else:
                tags_array = []

            # Prepare recommended_actions array
            recommended_actions = deal_data.get('recommended_actions', [])
            if isinstance(recommended_actions, list):
                actions_array = recommended_actions
            else:
                actions_array = []

            # Ensure required fields are present
            # Handle empty strings, None, or missing values
            deal_title = deal_data.get('deal_title')
            if not deal_title or (isinstance(deal_title, str) and not deal_title.strip()):
                # Generate a descriptive title if missing
                talent_name_val = deal_data.get('talent_name') or 'Talent'
                if talent_name_val and talent_name_val != 'Unknown':
                    deal_title = f"Hiring {talent_name_val}"
                elif deal_data.get('related_project_id'):
                    deal_title = "Project Opportunity"
                else:
                    deal_title = 'Untitled Deal'
            talent_name = deal_data.get('talent_name') or 'Unknown'

            # Insert deal
            cur.execute("""
                INSERT INTO deals (
                    user_id, company_id, deal_title, talent_name, talent_id, company_name,
                    stage, status, value, probability, expected_close_date, description,
                    tags, lead_source, match_score, skills, experience, location, work_model,
                    related_job_id, related_project_id, ai_insights, deal_health_score, recommended_actions
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING deal_id
            """, (
                user_id,
                company_id,
                deal_title,
                talent_name,
                deal_data.get('talent_id'),
                deal_data.get('company_name') or '',
                deal_data.get('stage', 'Prospecting'),
                deal_data.get('status', 'active'),
                deal_data.get('value'),
                deal_data.get('probability'),
                deal_data.get('expected_close_date'),
                deal_data.get('description') or '',
                tags_array,
                deal_data.get('lead_source') or 'manual',
                deal_data.get('match_score'),
                deal_data.get('skills') or '',
                deal_data.get('experience') or '',
                deal_data.get('location') or '',
                deal_data.get('work_model') or '',
                deal_data.get('related_job_id'),
                deal_data.get('related_project_id'),
                json.dumps(deal_data.get('ai_insights')) if deal_data.get('ai_insights') else None,
                deal_data.get('deal_health_score'),
                actions_array
            ))
            deal_id = cur.fetchone()[0]
            conn.commit()
            return deal_id

    @staticmethod
    def get_deal_by_id(conn, deal_id: int, user_id: int = None) -> Optional[Dict[str, Any]]:
        """Get deal by ID, optionally filtered by user_id."""
        with conn.cursor() as cur:
            if user_id:
                cur.execute("""
                    SELECT * FROM deals
                    WHERE deal_id = %s AND user_id = %s
                """, (deal_id, user_id))
            else:
                cur.execute("SELECT * FROM deals WHERE deal_id = %s", (deal_id,))

            row = cur.fetchone()
            if not row:
                return None

            colnames = [desc[0] for desc in cur.description]
            deal = dict(zip(colnames, row))

            # Format dates
            if deal.get('expected_close_date'):
                deal['expected_close_date'] = deal['expected_close_date'].isoformat()
            if deal.get('closed_date'):
                deal['closed_date'] = deal['closed_date'].isoformat()
            if deal.get('created_at'):
                deal['created_at'] = deal['created_at'].isoformat()
            if deal.get('updated_at'):
                deal['updated_at'] = deal['updated_at'].isoformat()

            # Convert deal_id to id for frontend compatibility
            deal['id'] = f"deal-{deal['deal_id']}"

            # Add camelCase fields for frontend compatibility
            # Ensure dealTitle is never empty - use deal_title or generate from context
            deal_title_val = deal.get('deal_title', '') or ''
            if not deal_title_val or not deal_title_val.strip():
                # Generate title from available data
                talent_name_val = deal.get('talent_name', '')
                if talent_name_val and talent_name_val != 'Unknown':
                    deal_title_val = f"Hiring {talent_name_val}"
                elif deal.get('related_project_id'):
                    deal_title_val = "Project Opportunity"
                else:
                    deal_title_val = 'Untitled Deal'
            deal['dealTitle'] = deal_title_val
            deal['talentName'] = deal.get('talent_name', 'Unknown')
            deal['companyName'] = deal.get('company_name', '')
            deal['talentId'] = deal.get('talent_id', '')
            deal['expectedCloseDate'] = deal.get('expected_close_date')
            deal['closedDate'] = deal.get('closed_date')
            deal['createdAt'] = deal.get('created_at')
            deal['updatedAt'] = deal.get('updated_at')
            deal['workModel'] = deal.get('work_model', '')
            deal['matchScore'] = deal.get('match_score')
            deal['leadSource'] = deal.get('lead_source', '')

            return deal

    @staticmethod
    def get_deals_by_user(conn, user_id: int) -> List[Dict[str, Any]]:
        """Get all deals for a user."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM deals
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            deals = []

            for row in rows:
                deal = dict(zip(colnames, row))

                # Format dates
                if deal.get('expected_close_date'):
                    deal['expected_close_date'] = deal['expected_close_date'].isoformat()
                if deal.get('closed_date'):
                    deal['closed_date'] = deal['closed_date'].isoformat()
                if deal.get('created_at'):
                    deal['created_at'] = deal['created_at'].isoformat()
                if deal.get('updated_at'):
                    deal['updated_at'] = deal['updated_at'].isoformat()

                # Convert deal_id to id for frontend compatibility
                deal['id'] = f"deal-{deal['deal_id']}"

                # Add camelCase fields for frontend compatibility
                # Ensure dealTitle is never empty - use deal_title or generate from context
                deal_title_val = deal.get('deal_title', '') or ''
                if not deal_title_val or not deal_title_val.strip():
                    # Generate title from available data
                    talent_name_val = deal.get('talent_name', '')
                    if talent_name_val and talent_name_val != 'Unknown':
                        deal_title_val = f"Hiring {talent_name_val}"
                    elif deal.get('related_project_id'):
                        deal_title_val = "Project Opportunity"
                    else:
                        deal_title_val = 'Untitled Deal'
                deal['dealTitle'] = deal_title_val
                deal['talentName'] = deal.get('talent_name', 'Unknown')
                deal['companyName'] = deal.get('company_name', '')
                deal['talentId'] = deal.get('talent_id', '')
                deal['expectedCloseDate'] = deal.get('expected_close_date')
                deal['closedDate'] = deal.get('closed_date')
                deal['createdAt'] = deal.get('created_at')
                deal['updatedAt'] = deal.get('updated_at')
                deal['workModel'] = deal.get('work_model', '')
                deal['matchScore'] = deal.get('match_score')
                deal['leadSource'] = deal.get('lead_source', '')

                deals.append(deal)

            return deals

    @staticmethod
    def update_deal(conn, deal_id: int, user_id: int, deal_data: Dict[str, Any]) -> bool:
        """Update a deal."""
        with conn.cursor() as cur:
            # Build update query dynamically
            updates = []
            values = []

            allowed_fields = [
                'deal_title', 'talent_name', 'company_name', 'stage', 'status',
                'value', 'probability', 'expected_close_date', 'closed_date',
                'description', 'tags', 'lead_source', 'match_score', 'skills',
                'experience', 'location', 'work_model', 'related_job_id',
                'related_project_id', 'ai_insights', 'deal_health_score', 'recommended_actions'
            ]

            for field in allowed_fields:
                if field in deal_data:
                    if field == 'tags' or field == 'recommended_actions':
                        # Handle array fields
                        updates.append(f"{field} = %s")
                        values.append(deal_data[field] if isinstance(deal_data[field], list) else [])
                    elif field == 'ai_insights':
                        # Handle JSONB field
                        updates.append(f"{field} = %s")
                        values.append(json.dumps(deal_data[field]) if deal_data[field] else None)
                    else:
                        updates.append(f"{field} = %s")
                        values.append(deal_data[field])

            if not updates:
                return False

            # Add updated_at
            updates.append("updated_at = CURRENT_TIMESTAMP")

            # Add deal_id and user_id to values
            values.extend([deal_id, user_id])

            query = f"""
                UPDATE deals
                SET {', '.join(updates)}
                WHERE deal_id = %s AND user_id = %s
            """

            cur.execute(query, values)
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def update_deal_stage(conn, deal_id: int, user_id: int, stage: str) -> bool:
        """Update deal stage (for drag-and-drop)."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE deals
                SET stage = %s, updated_at = CURRENT_TIMESTAMP
                WHERE deal_id = %s AND user_id = %s
            """, (stage, deal_id, user_id))
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def delete_deal(conn, deal_id: int, user_id: int) -> bool:
        """Delete a deal."""
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM deals
                WHERE deal_id = %s AND user_id = %s
            """, (deal_id, user_id))
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def get_deal_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get deal metrics for a user."""
        with conn.cursor() as cur:
            # Total deals
            cur.execute("SELECT COUNT(*) FROM deals WHERE user_id = %s", (user_id,))
            total_deals = cur.fetchone()[0] or 0

            # Active deals
            cur.execute("SELECT COUNT(*) FROM deals WHERE user_id = %s AND status = 'active'", (user_id,))
            active_deals = cur.fetchone()[0] or 0

            # Closed won
            cur.execute("SELECT COUNT(*) FROM deals WHERE user_id = %s AND stage = 'Closed Won'", (user_id,))
            closed_won = cur.fetchone()[0] or 0

            # Total value
            cur.execute("SELECT COALESCE(SUM(value), 0) FROM deals WHERE user_id = %s", (user_id,))
            total_value = float(cur.fetchone()[0] or 0)

            # Average deal value
            cur.execute("SELECT COALESCE(AVG(value), 0) FROM deals WHERE user_id = %s AND value IS NOT NULL", (user_id,))
            avg_deal_value = float(cur.fetchone()[0] or 0)

            # Win rate
            win_rate = (closed_won / total_deals * 100) if total_deals > 0 else 0

            # Average deal duration (days from creation to close for closed deals)
            cur.execute("""
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (closed_date - created_at)) / 86400), 0)
                FROM deals
                WHERE user_id = %s AND closed_date IS NOT NULL
            """, (user_id,))
            avg_deal_duration = float(cur.fetchone()[0] or 0)

            return {
                'totalDeals': total_deals,
                'activeDeals': active_deals,
                'closedWon': closed_won,
                'totalValue': total_value,
                'avgDealValue': avg_deal_value,
                'winRate': round(win_rate, 1),
                'avgDealDuration': round(avg_deal_duration, 0)
            }
