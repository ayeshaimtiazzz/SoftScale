"""Deal controller."""
from fastapi import HTTPException, status
from services import DealService
from models import CreateDealRequest, UpdateDealRequest, UpdateDealStageRequest

class DealController:
    """Controller for deal endpoints."""

    @staticmethod
    def create_deal(request: CreateDealRequest, user_id: int):
        """Create a new deal."""
        try:
            deal_data = request.dict(exclude_none=True)
            return DealService.create_deal(user_id, deal_data)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_deal(deal_id: str, user_id: int):
        """Get a deal by ID."""
        try:
            # Reject non-numeric strings like "metrics"
            if isinstance(deal_id, str) and not deal_id.isdigit() and not deal_id.startswith("deal-"):
                raise ValueError(f"Invalid deal ID format: {deal_id}")

            # Extract numeric ID from deal_id string (format: "deal-123")
            if isinstance(deal_id, str) and deal_id.startswith("deal-"):
                deal_id = int(deal_id.replace("deal-", ""))
            elif isinstance(deal_id, str):
                # Try to convert string to int
                deal_id = int(deal_id)

            return DealService.get_deal(deal_id, user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_all_deals(user_id: int):
        """Get all deals for a user."""
        try:
            deals = DealService.get_all_deals(user_id)
            return {"deals": deals}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def update_deal(deal_id: int, request: UpdateDealRequest, user_id: int):
        """Update a deal."""
        try:
            # Extract numeric ID from deal_id string
            if isinstance(deal_id, str) and deal_id.startswith("deal-"):
                deal_id = int(deal_id.replace("deal-", ""))

            deal_data = request.dict(exclude_none=True)
            return DealService.update_deal(deal_id, user_id, deal_data)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def update_deal_stage(deal_id: int, request: UpdateDealStageRequest, user_id: int):
        """Update deal stage (for drag-and-drop)."""
        try:
            # Extract numeric ID from deal_id string
            if isinstance(deal_id, str) and deal_id.startswith("deal-"):
                deal_id = int(deal_id.replace("deal-", ""))

            return DealService.update_deal_stage(deal_id, user_id, request.stage)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def delete_deal(deal_id: int, user_id: int):
        """Delete a deal."""
        try:
            # Extract numeric ID from deal_id string
            if isinstance(deal_id, str) and deal_id.startswith("deal-"):
                deal_id = int(deal_id.replace("deal-", ""))

            return DealService.delete_deal(deal_id, user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_deal_metrics(user_id: int):
        """Get deal metrics for a user."""
        try:
            return DealService.get_deal_metrics(user_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def create_deal_from_project(project_id: int, user_id: int):
        """Create a deal from a project."""
        try:
            return DealService.create_deal_from_project(user_id, project_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
