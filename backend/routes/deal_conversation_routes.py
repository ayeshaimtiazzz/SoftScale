"""Deal in-app conversation threads and persisted sentiment (under /api)."""
from typing import Optional

from fastapi import APIRouter, Depends, Path, Body, BackgroundTasks
from pydantic import BaseModel, Field

from controllers.deal_conversation_controller import DealConversationController
from middleware import get_current_user
from services.deal_sentiment_worker import process_deal_message_sentiment

router = APIRouter(prefix="/api", tags=["deal-conversation"])


class ConversationMessageBody(BaseModel):
    body: str
    conversation_id: Optional[int] = Field(
        default=None,
        description="Thread id; omit to use the deal's primary thread.",
    )


class NewConversationBody(BaseModel):
    title: str = Field(default="New conversation", max_length=255)


@router.post("/deals/{deal_id}/conversations")
def create_deal_conversation(
    deal_id: int = Path(...),
    payload: NewConversationBody = Body(...),
    user_id: int = Depends(get_current_user),
):
    return DealConversationController.create_conversation(
        deal_id, user_id, payload.title
    )


@router.get("/deals/{deal_id}/conversations")
def list_deal_conversations(
    deal_id: int = Path(...),
    user_id: int = Depends(get_current_user),
):
    return DealConversationController.list_conversations(deal_id, user_id)


@router.get("/deals/{deal_id}/conversations/{conversation_id}/thread")
def get_conversation_thread(
    deal_id: int = Path(...),
    conversation_id: int = Path(...),
    user_id: int = Depends(get_current_user),
):
    return DealConversationController.get_thread(deal_id, conversation_id, user_id)


@router.post("/deals/{deal_id}/conversation/messages")
def post_conversation_message(
    background_tasks: BackgroundTasks,
    deal_id: int = Path(...),
    payload: ConversationMessageBody = Body(...),
    user_id: int = Depends(get_current_user),
):
    out = DealConversationController.post_message(
        deal_id, user_id, payload.body, payload.conversation_id
    )
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
