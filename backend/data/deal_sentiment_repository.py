"""Persisted sentiment analysis rows linked to deals and conversation messages."""
import json
from typing import Any, Dict, List, Optional


class DealSentimentRepository:
    @staticmethod
    def ensure_tables(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS deal_sentiment_analyses (
                    analysis_id SERIAL PRIMARY KEY,
                    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
                    conversation_message_id INTEGER
                        REFERENCES deal_conversation_messages(message_id) ON DELETE SET NULL,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    message_excerpt TEXT,
                    analysis_json JSONB NOT NULL,
                    report_text TEXT,
                    status VARCHAR(32) DEFAULT 'completed',
                    error_detail TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_sent_deal_id
                ON deal_sentiment_analyses(deal_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_sent_msg_id
                ON deal_sentiment_analyses(conversation_message_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_deal_sent_created
                ON deal_sentiment_analyses(created_at DESC);
                """
            )
            conn.commit()

    @staticmethod
    def insert_analysis(
        conn,
        deal_id: int,
        conversation_message_id: Optional[int],
        user_id: int,
        message_excerpt: str,
        analysis: Dict[str, Any],
        report_text: str,
        status: str = "completed",
        error_detail: Optional[str] = None,
    ) -> int:
        payload = json.dumps(analysis or {}, default=str)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO deal_sentiment_analyses (
                    deal_id, conversation_message_id, user_id, message_excerpt,
                    analysis_json, report_text, status, error_detail
                ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING analysis_id
                """,
                (
                    deal_id,
                    conversation_message_id,
                    user_id,
                    message_excerpt[:4000] if message_excerpt else "",
                    payload,
                    report_text or "",
                    status,
                    error_detail,
                ),
            )
            aid = cur.fetchone()[0]
            conn.commit()
            return aid

    @staticmethod
    def list_for_deal(conn, deal_id: int) -> List[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT analysis_id, deal_id, conversation_message_id, user_id,
                       message_excerpt, analysis_json, report_text, status, error_detail, created_at
                FROM deal_sentiment_analyses
                WHERE deal_id = %s
                ORDER BY created_at DESC
                LIMIT 100
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
                if rec.get("analysis_json") is not None:
                    if isinstance(rec["analysis_json"], dict):
                        pass
                    else:
                        rec["analysis_json"] = dict(rec["analysis_json"])
                out.append(rec)
            return out
