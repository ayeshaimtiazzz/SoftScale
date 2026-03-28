"""In-app deal conversation messages (distinct from internal notes)."""
import psycopg2
from typing import Any, Dict, List, Optional


class DealConversationRepository:
    @staticmethod
    def ensure_tables(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS deal_conversation_messages (
                    message_id SERIAL PRIMARY KEY,
                    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    body TEXT NOT NULL,
                    sentiment_status VARCHAR(32) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_conv_deal_id
                ON deal_conversation_messages(deal_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_conv_created
                ON deal_conversation_messages(created_at DESC);
                """
            )
            conn.commit()

    @staticmethod
    def insert_message(conn, deal_id: int, user_id: int, body: str) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO deal_conversation_messages (deal_id, user_id, body, sentiment_status)
                VALUES (%s, %s, %s, 'pending')
                RETURNING message_id
                """,
                (deal_id, user_id, body),
            )
            mid = cur.fetchone()[0]
            conn.commit()
            return mid

    @staticmethod
    def update_sentiment_status(conn, message_id: int, status: str) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE deal_conversation_messages
                SET sentiment_status = %s
                WHERE message_id = %s
                """,
                (status, message_id),
            )
            conn.commit()

    @staticmethod
    def get_message(conn, message_id: int) -> Optional[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM deal_conversation_messages WHERE message_id = %s",
                (message_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [d[0] for d in cur.description]
            rec = dict(zip(cols, row))
            if rec.get("created_at"):
                rec["created_at"] = rec["created_at"].isoformat()
            return rec

    @staticmethod
    def list_messages_for_deal(conn, deal_id: int) -> List[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT m.*, u.name AS author_name
                FROM deal_conversation_messages m
                LEFT JOIN users u ON m.user_id = u.user_id
                WHERE m.deal_id = %s
                ORDER BY m.created_at ASC
                """,
                (deal_id,),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            out: List[Dict[str, Any]] = []
            for row in rows:
                rec = dict(zip(cols, row))
                if rec.get("created_at"):
                    rec["created_at"] = rec["created_at"].isoformat()
                out.append(rec)
            return out
