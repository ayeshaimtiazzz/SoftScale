"""Deal in-app conversation and persisted sentiment (under /api)."""
from fastapi import APIRouter, Depends, Path, Body, BackgroundTasks
from pydantic import BaseModel

from controllers.deal_conversation_controller import DealConversationController
from middleware import get_current_user
from services.deal_sentiment_worker import process_deal_message_sentiment

router = APIRouter(prefix="/api", tags=["deal-conversation"])


class ConversationMessageBody(BaseModel):
    body: str


@router.post("/deals/{deal_id}/conversation/messages")
def post_conversation_message(
    deal_id: int = Path(...),
    payload: ConversationMessageBody = Body(...),
    user_id: int = Depends(get_current_user),
    background_tasks: BackgroundTasks,
):
    out = DealConversationController.post_message(deal_id, user_id, payload.body)
    background_tasks.add_task(
        process_deal_message_sentiment,
        deal_id,
        out["message_id"],
        user_id,
    )
    return out


@router.get("/deals/{deal_id}/conversation/messages")
def list_conversation_messages(
    deal_id: int = Path(...),
    user_id: int = Depends(get_current_user),
):
    return DealConversationController.list_messages(deal_id, user_id)


@router.get("/deals/{deal_id}/sentiment-analyses")
def list_deal_sentiment_analyses(
    deal_id: int = Path(...),
    user_id: int = Depends(get_current_user),
):
    return DealConversationController.list_sentiment(deal_id, user_id)
