"""Deal conversation threads + sentiment persistence orchestration."""
import json
from typing import Any, Dict, List, Optional

from data import (
    get_db,
    DealRepository,
    DealConversationRepository,
    DealSentimentRepository,
)


def _parse_analysis_json(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}


def _sanitize_stored_suggested_reply(text: Any) -> str:
    """Strip legacy prompt leakage from replies stored before decode_new_tokens fix."""
    if text is None:
        return ""
    t = str(text).strip()
    if not t:
        return ""
    if "[/INST]" in t:
        t = t.split("[/INST]")[-1].strip()
    junk_line_starts = (
        "You are an AI messaging assistant",
        "Intent of sender:",
        "Response strategy:",
        "Original email:",
        "- Do NOT repeat",
        "- Maintain a calm",
        "- Do not pressure",
        "- End with a professional",
        "- it is not an email",
    )
    lines = t.splitlines()
    while lines:
        stripped = lines[0].strip()
        if not stripped:
            lines.pop(0)
            continue
        if any(stripped.startswith(p) or p.lower() in stripped[:90].lower() for p in junk_line_starts):
            lines.pop(0)
            continue
        break
    t = "\n".join(lines).strip()
    if len(t) > 12000:
        return t[:12000].rstrip() + "\n…"
    return t


def _sanitize_stored_report_text(text: Any) -> str:
    """Strip legacy prompt leakage from reports stored before decode_new_tokens fix."""
    if text is None:
        return ""
    t = str(text).strip()
    if not t:
        return ""
    if "[/INST]" in t:
        t = t.split("[/INST]")[-1].strip()
    if "Now generate the Communication Analysis Report" in t:
        t = t.split("Now generate the Communication Analysis Report")[-1].strip()
    title = "Communication Analysis Report"
    if title in t:
        i = t.find(title)
        if i > 600:
            t = t[i:].strip()
    if "Input Data:" in t and len(t) > 2500 and title in t:
        i = t.find(title)
        if i != -1:
            t = t[i:].strip()
    if len(t) > 50000:
        return t[:50000].rstrip() + "\n…"
    return t


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
    def _assert_thread_in_deal(conn, deal_id: int, conversation_id: int) -> None:
        row = DealConversationRepository.get_conversation(conn, conversation_id, deal_id)
        if not row:
            raise ValueError("Conversation not found for this deal")

    @staticmethod
    def create_conversation(deal_id: int, user_id: int, title: str) -> Dict[str, Any]:
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            cid = DealConversationRepository.insert_conversation(conn, deal_id, user_id, title)
            return {"success": True, "conversation_id": cid}
        finally:
            conn.close()

    @staticmethod
    def list_conversations(deal_id: int, user_id: int) -> List[Dict[str, Any]]:
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            rows = DealConversationRepository.list_conversations_for_deal(conn, deal_id)
            if not rows:
                cid = DealConversationRepository.get_or_create_primary_conversation(conn, deal_id, user_id)
                rows = DealConversationRepository.list_conversations_for_deal(conn, deal_id)
            return rows
        finally:
            conn.close()

    @staticmethod
    def get_thread(deal_id: int, conversation_id: int, user_id: int) -> List[Dict[str, Any]]:
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            DealConversationService._assert_thread_in_deal(conn, deal_id, conversation_id)
            raw = DealConversationRepository.list_thread_with_sentiment(conn, conversation_id)
            return [DealConversationService._shape_thread_row(r) for r in raw]
        finally:
            conn.close()

    @staticmethod
    def _shape_thread_row(r: Dict[str, Any]) -> Dict[str, Any]:
        aj = _parse_analysis_json(r.get("analysis_json"))
        sent = aj.get("sentiment") if isinstance(aj.get("sentiment"), dict) else {}
        urgency = aj.get("urgency") if isinstance(aj.get("urgency"), dict) else {}
        conf = aj.get("confidence_scores") if isinstance(aj.get("confidence_scores"), dict) else {}

        sentiment_block = None
        if r.get("analysis_id"):
            reply_raw = aj.get("suggested_reply")
            report_raw = r.get("report_text") or ""
            sentiment_block = {
                "analysis_id": r.get("analysis_id"),
                "record_status": r.get("analysis_record_status"),
                "label": sent.get("label"),
                "confidence": sent.get("confidence"),
                "intent": aj.get("intent"),
                "intent_confidence": conf.get("intent_confidence"),
                "interest_score": aj.get("interest_score"),
                "strategy": aj.get("strategy"),
                "urgency_level": urgency.get("level"),
                "urgency_response_time": urgency.get("recommended_response_time"),
                "summary": aj.get("summary"),
                "suggested_reply": _sanitize_stored_suggested_reply(reply_raw),
                "key_signals": aj.get("key_signals"),
                "next_steps": aj.get("next_steps"),
                "risks": aj.get("risks"),
                "report_text": _sanitize_stored_report_text(report_raw),
                "analysis_error": r.get("analysis_error"),
                "analyzed_at": r.get("analysis_created_at"),
            }

        return {
            "message_id": r.get("message_id"),
            "deal_id": r.get("deal_id"),
            "conversation_id": r.get("conversation_id"),
            "user_id": r.get("user_id"),
            "author_name": r.get("author_name"),
            "body": r.get("body"),
            "sentiment_status": r.get("sentiment_status"),
            "created_at": r.get("created_at"),
            "sentiment": sentiment_block,
        }

    @staticmethod
    def post_message(
        deal_id: int, user_id: int, body: str, conversation_id: Optional[int] = None
    ) -> Dict[str, Any]:
        text = (body or "").strip()
        if not text:
            raise ValueError("Message must not be empty")
        conn = get_db()
        try:
            DealConversationService._ensure(conn)
            DealConversationService.assert_deal_access(conn, deal_id, user_id)
            cid = conversation_id
            if cid is None:
                cid = DealConversationRepository.get_or_create_primary_conversation(
                    conn, deal_id, user_id
                )
            else:
                DealConversationService._assert_thread_in_deal(conn, deal_id, cid)
            mid = DealConversationRepository.insert_message(conn, deal_id, cid, user_id, text)
            return {
                "success": True,
                "message_id": mid,
                "deal_id": deal_id,
                "conversation_id": cid,
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
