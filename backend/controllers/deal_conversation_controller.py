"""HTTP controller for deal conversation + sentiment listing."""
from fastapi import HTTPException, status

from services.deal_conversation_service import DealConversationService


class DealConversationController:
    @staticmethod
    def post_message(deal_id: int, user_id: int, body: str):
        try:
            return DealConversationService.post_message(deal_id, user_id, body)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )

    @staticmethod
    def list_messages(deal_id: int, user_id: int):
        try:
            return {"success": True, "messages": DealConversationService.list_messages(deal_id, user_id)}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )

    @staticmethod
    def list_sentiment(deal_id: int, user_id: int):
        try:
            rows = DealConversationService.list_sentiment_analyses(deal_id, user_id)
            return {"success": True, "analyses": rows}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
