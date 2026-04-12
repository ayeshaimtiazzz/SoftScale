"""Dashboard controller."""
from typing import Optional

from fastapi import HTTPException, status
from services import DashboardService

class DashboardController:
    """Controller for dashboard endpoints."""

    @staticmethod
    def get_dashboard_metrics(user_id: int, role: str):
        """Get dashboard metrics."""
        try:
            return DashboardService.get_dashboard_metrics(user_id, role)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_skill_ranking(user_id: int, role: str = None):
        """Get server-side skill ranking and gap insights."""
        try:
            return DashboardService.get_skill_ranking(user_id, role)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_bidding_ranking(
        user_id: int,
        role: str = None,
        project_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ):
        """Get server-side project bidding ranking tied to prospects/deals."""
        try:
            return DashboardService.get_bidding_ranking(
                user_id, role, project_id=project_id, job_id=job_id
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_sentiment_ranking(
        user_id: int,
        role: str = None,
        project_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ):
        """Get server-side sentiment ranking tied to deals/conversations."""
        try:
            return DashboardService.get_sentiment_ranking(
                user_id, role, project_id=project_id, job_id=job_id
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


