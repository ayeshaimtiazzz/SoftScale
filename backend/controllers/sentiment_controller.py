"""Controller for sentiment analysis feature."""
from typing import Any, Dict

from services.sentiment_analysis_service import SentimentAnalysisService


class SentimentController:
  """Thin controller layer over SentimentAnalysisService."""

  @staticmethod
  def analyze_message(message: str) -> Dict[str, Any]:
      service = SentimentAnalysisService()
      return service.analyze_message(message)

