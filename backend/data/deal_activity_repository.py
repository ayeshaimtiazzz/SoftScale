"""Deal activity timeline persistence."""
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class DealActivityRepository:
    @staticmethod
    def ensure_table(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS deal_activity_events (
                    activity_id SERIAL PRIMARY KEY,
                    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
                    event_type VARCHAR(80) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_activity_deal_id
                ON deal_activity_events(deal_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_activity_user_id
                ON deal_activity_events(user_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_activity_type
                ON deal_activity_events(event_type);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_activity_created
                ON deal_activity_events(created_at DESC);
                """
            )
            conn.commit()

    @staticmethod
    def add_event(
        conn,
        *,
        deal_id: int,
        user_id: Optional[int],
        event_type: str,
        title: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO deal_activity_events (
                    deal_id, user_id, event_type, title, description, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                RETURNING activity_id
                """,
                (
                    deal_id,
                    user_id,
                    event_type[:80],
                    title[:255],
                    description,
                    json.dumps(metadata or {}, default=str),
                ),
            )
            aid = cur.fetchone()[0]
            conn.commit()
            return int(aid)

    @staticmethod
    def list_for_deal(conn, deal_id: int, limit: int = 200) -> List[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT activity_id, deal_id, user_id, event_type, title, description, metadata, created_at
                FROM deal_activity_events
                WHERE deal_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (deal_id, limit),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            out: List[Dict[str, Any]] = []
            for row in rows:
                rec = dict(zip(cols, row))
                if rec.get("created_at"):
                    rec["created_at"] = rec["created_at"].isoformat()
                if isinstance(rec.get("metadata"), str):
                    try:
                        rec["metadata"] = json.loads(rec["metadata"])
                    except json.JSONDecodeError:
                        rec["metadata"] = {}
                elif rec.get("metadata") is None:
                    rec["metadata"] = {}
                out.append(rec)
            return out


def log_deal_activity_safe(
    *,
    deal_id: int,
    user_id: Optional[int],
    event_type: str,
    title: str,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[int]:
    """Fire-and-forget helper; does not break caller flow on DB issues."""
    from data import get_db

    conn = get_db()
    try:
        DealActivityRepository.ensure_table(conn)
        return DealActivityRepository.add_event(
            conn,
            deal_id=deal_id,
            user_id=user_id,
            event_type=event_type,
            title=title,
            description=description,
            metadata=metadata,
        )
    except Exception as e:
        logger.warning("Could not log deal activity: %s", e)
        return None
    finally:
        conn.close()
