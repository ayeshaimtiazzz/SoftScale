"""Dashboard controller."""
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

