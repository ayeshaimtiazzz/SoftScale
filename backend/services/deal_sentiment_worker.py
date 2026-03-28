"""Background sentiment pipeline for deal conversation messages."""
from __future__ import annotations

from data import (
    get_db,
    DealConversationRepository,
    DealSentimentRepository,
    DealRepository,
)
from services.notification_service import NotificationService
from services.sentiment_analysis_service import SentimentAnalysisService


def _notify_parties(
    deal_id: int,
    analysis_id: int,
    deal_owner_id: int,
    author_user_id: int,
    excerpt: str,
) -> None:
    title = "Deal sentiment analysis ready"
    msg = (excerpt[:180] + "…") if len(excerpt) > 180 else excerpt
    body = f"Sentiment for a deal message is ready. Preview: {msg}"

    def _one(uid: int) -> None:
        try:
            NotificationService.create_notification(
                user_id=uid,
                title=title,
                message=body,
                notification_type="deal_sentiment",
                deal_id=deal_id,
                related_entity_type="deal_sentiment",
                related_entity_id=analysis_id,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[deal_sentiment_worker] notification failed for user {uid}: {exc}", flush=True)

    _one(author_user_id)
    if deal_owner_id != author_user_id:
        _one(deal_owner_id)


def process_deal_message_sentiment(deal_id: int, message_id: int, author_user_id: int) -> None:
    """Runs after HTTP response; loads text, analyzes, stores, notifies."""
    conn = get_db()
    try:
        DealConversationRepository.ensure_tables(conn)
        DealSentimentRepository.ensure_tables(conn)
        row = DealConversationRepository.get_message(conn, message_id)
        if not row or row.get("deal_id") != deal_id:
            return
        text = row.get("body") or ""
        if not text.strip():
            DealConversationRepository.update_sentiment_status(conn, message_id, "skipped")
            return

        deal = DealRepository.get_deal_by_id(conn, deal_id, user_id=None)
        if not deal:
            DealConversationRepository.update_sentiment_status(conn, message_id, "failed")
            return
        owner_id = int(deal["user_id"])

        try:
            svc = SentimentAnalysisService()
            result = svc.analyze_message(text)
        except Exception as exc:  # noqa: BLE001
            DealConversationRepository.update_sentiment_status(conn, message_id, "failed")
            DealSentimentRepository.insert_analysis(
                conn,
                deal_id=deal_id,
                conversation_message_id=message_id,
                user_id=author_user_id,
                message_excerpt=text,
                analysis={},
                report_text="",
                status="failed",
                error_detail=str(exc)[:2000],
            )
            print(f"[deal_sentiment_worker] analyze failed: {exc}", flush=True)
            return

        analysis = result.get("analysis") or {}
        report = result.get("report_text") or ""

        aid = DealSentimentRepository.insert_analysis(
            conn,
            deal_id=deal_id,
            conversation_message_id=message_id,
            user_id=author_user_id,
            message_excerpt=text,
            analysis=analysis,
            report_text=report,
            status="completed",
            error_detail=None,
        )
        DealConversationRepository.update_sentiment_status(conn, message_id, "completed")
        _notify_parties(deal_id, aid, owner_id, author_user_id, text)
    finally:
        conn.close()
