"""In-app deal conversation threads and messages (distinct from internal notes)."""
import json
from typing import Any, Dict, List, Optional


def _backfill_default_threads(conn) -> None:
    """Attach legacy messages (NULL conversation_id) to a per-deal 'Original thread'."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT deal_id FROM deal_conversation_messages
            WHERE conversation_id IS NULL
            """
        )
        rows = cur.fetchall()
        for (did,) in rows:
            cur.execute("SELECT user_id FROM deals WHERE deal_id = %s", (did,))
            row = cur.fetchone()
            if not row:
                continue
            owner_id = row[0]
            cur.execute(
                """
                INSERT INTO deal_conversations (deal_id, user_id, title)
                VALUES (%s, %s, 'Original thread')
                RETURNING conversation_id
                """,
                (did, owner_id),
            )
            cid = cur.fetchone()[0]
            cur.execute(
                """
                UPDATE deal_conversation_messages
                SET conversation_id = %s
                WHERE deal_id = %s AND conversation_id IS NULL
                """,
                (cid, did),
            )
        conn.commit()


class DealConversationRepository:
    @staticmethod
    def ensure_tables(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS deal_conversations (
                    conversation_id SERIAL PRIMARY KEY,
                    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL DEFAULT 'Conversation',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_conv_threads_deal
                ON deal_conversations(deal_id);
                """
            )
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
                ALTER TABLE deal_conversation_messages
                ADD COLUMN IF NOT EXISTS conversation_id INTEGER
                REFERENCES deal_conversations(conversation_id) ON DELETE CASCADE;
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
                CREATE INDEX IF NOT EXISTS idx_deal_conv_msg_thread
                ON deal_conversation_messages(conversation_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_conv_created
                ON deal_conversation_messages(created_at DESC);
                """
            )
            conn.commit()
        _backfill_default_threads(conn)

    @staticmethod
    def insert_conversation(conn, deal_id: int, user_id: int, title: str) -> int:
        t = (title or "").strip() or "New conversation"
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO deal_conversations (deal_id, user_id, title)
                VALUES (%s, %s, %s)
                RETURNING conversation_id
                """,
                (deal_id, user_id, t),
            )
            cid = cur.fetchone()[0]
            conn.commit()
            return cid

    @staticmethod
    def get_conversation(conn, conversation_id: int, deal_id: int) -> Optional[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM deal_conversations
                WHERE conversation_id = %s AND deal_id = %s
                """,
                (conversation_id, deal_id),
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
    def list_conversations_for_deal(conn, deal_id: int) -> List[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    c.conversation_id,
                    c.deal_id,
                    c.user_id,
                    c.title,
                    c.created_at,
                    (SELECT COUNT(*) FROM deal_conversation_messages m
                     WHERE m.conversation_id = c.conversation_id) AS message_count,
                    (SELECT m.body FROM deal_conversation_messages m
                     WHERE m.conversation_id = c.conversation_id
                     ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
                    (SELECT m.created_at FROM deal_conversation_messages m
                     WHERE m.conversation_id = c.conversation_id
                     ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
                FROM deal_conversations c
                WHERE c.deal_id = %s
                ORDER BY COALESCE(
                    (SELECT MAX(m.created_at) FROM deal_conversation_messages m
                     WHERE m.conversation_id = c.conversation_id),
                    c.created_at
                ) DESC
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
                if rec.get("last_message_at"):
                    rec["last_message_at"] = rec["last_message_at"].isoformat()
                out.append(rec)
            return out

    @staticmethod
    def get_or_create_primary_conversation(conn, deal_id: int, user_id: int) -> int:
        """First thread for deal, or create 'Main conversation'."""
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT conversation_id FROM deal_conversations
                WHERE deal_id = %s
                ORDER BY created_at ASC
                LIMIT 1
                """,
                (deal_id,),
            )
            row = cur.fetchone()
            if row:
                return row[0]
            cur.execute(
                """
                INSERT INTO deal_conversations (deal_id, user_id, title)
                VALUES (%s, %s, 'Main conversation')
                RETURNING conversation_id
                """,
                (deal_id, user_id),
            )
            cid = cur.fetchone()[0]
            conn.commit()
            return cid

    @staticmethod
    def insert_message(conn, deal_id: int, conversation_id: int, user_id: int, body: str) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO deal_conversation_messages
                    (deal_id, conversation_id, user_id, body, sentiment_status)
                VALUES (%s, %s, %s, %s, 'pending')
                RETURNING message_id
                """,
                (deal_id, conversation_id, user_id, body),
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
    def list_thread_with_sentiment(conn, conversation_id: int) -> List[Dict[str, Any]]:
        """Messages in thread with latest sentiment analysis joined (for UI)."""
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    m.message_id,
                    m.deal_id,
                    m.conversation_id,
                    m.user_id,
                    m.body,
                    m.sentiment_status,
                    m.created_at,
                    u.name AS author_name,
                    sa.analysis_id,
                    sa.analysis_json,
                    sa.report_text,
                    sa.status AS analysis_record_status,
                    sa.created_at AS analysis_created_at,
                    sa.error_detail AS analysis_error
                FROM deal_conversation_messages m
                LEFT JOIN users u ON m.user_id = u.user_id
                LEFT JOIN LATERAL (
                    SELECT s.analysis_id, s.analysis_json, s.report_text, s.status, s.created_at, s.error_detail
                    FROM deal_sentiment_analyses s
                    WHERE s.conversation_message_id = m.message_id
                    ORDER BY s.created_at DESC
                    LIMIT 1
                ) sa ON TRUE
                WHERE m.conversation_id = %s
                ORDER BY m.created_at ASC
                """,
                (conversation_id,),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            out: List[Dict[str, Any]] = []
            for row in rows:
                rec = dict(zip(cols, row))
                if rec.get("created_at"):
                    rec["created_at"] = rec["created_at"].isoformat()
                if rec.get("analysis_created_at"):
                    rec["analysis_created_at"] = rec["analysis_created_at"].isoformat()
                aj = rec.get("analysis_json")
                if isinstance(aj, str):
                    try:
                        rec["analysis_json"] = json.loads(aj)
                    except json.JSONDecodeError:
                        rec["analysis_json"] = {}
                elif aj is not None and not isinstance(aj, dict):
                    rec["analysis_json"] = {}
                out.append(rec)
            return out

    @staticmethod
    def list_messages_for_deal(conn, deal_id: int) -> List[Dict[str, Any]]:
        """All messages on deal (legacy / admin)."""
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
