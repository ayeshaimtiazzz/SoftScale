"""Deal conversation + sentiment persistence orchestration."""
from typing import Any, Dict, List

from data import (
    get_db,
    DealRepository,
    DealConversationRepository,
    DealSentimentRepository,
)


class DealConversationService:
    @staticmethod
    def _ensure(conn) -> None:
        DealConversationRepository.ensure_tables(conn)
        DealSentimentRepository.ensure_tables(conn)

    @staticmethod
    def assert_deal_access(conn, deal_id: int, user_id: int) -> Dict[str, Any]:
        if not DealRepository.user_can_access_deal(conn, deal_id, user_id):
            raise ValueError("Deal not found or access denied")
        deal = DealRepository.get_deal_by_id(conn, deal_id, user_id=None)
        if not deal:
            raise ValueError("Deal not found")
        return deal

    @staticmethod
    def post_message(deal_id: int, user_id: int, body: str) -> Dict[str, Any]:
        text = (body or "").strip()
        if not text:
            raise ValueError("Message must not be empty")
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            mid = DealConversationRepository.insert_message(conn, deal_id, user_id, text)
            return {
                "success": True,
                "message_id": mid,
                "deal_id": deal_id,
                "sentiment_pending": True,
            }
        finally:
            conn.close()

    @staticmethod
    def list_messages(deal_id: int, user_id: int) -> List[Dict[str, Any]]:
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            return DealConversationRepository.list_messages_for_deal(conn, deal_id)
        finally:
            conn.close()

    @staticmethod
    def list_sentiment_analyses(deal_id: int, user_id: int) -> List[Dict[str, Any]]:
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            return DealSentimentRepository.list_for_deal(conn, deal_id)
        finally:
            conn.close()
