"""Sentiment analysis routes."""
import asyncio
from io import BytesIO
import base64
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from controllers.sentiment_controller import SentimentController
from middleware import get_current_user


router = APIRouter(prefix="/api", tags=["sentiment"])


class SentimentAnalysisRequest(BaseModel):
    """Request body for running sentiment analysis on a message."""

    message: str


def _build_report_pdf(report_text: str) -> bytes:
    """Render the long-form report text into a simple PDF (in memory)."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    x_margin = 72  # 1 inch
    y = height - 72

    for line in report_text.splitlines():
        if not line.strip():
            y -= 14
            continue

        pdf.drawString(x_margin, y, line)
        y -= 14
        if y < 72:
            pdf.showPage()
            y = height - 72

    pdf.save()
    buffer.seek(0)
    return buffer.read()


@router.post("/sentiment-analysis")
async def run_sentiment_analysis(
    request: SentimentAnalysisRequest = Body(...),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """Run full sentiment analysis on a single message.

    Returns:
        {
          "analysis": { ... },             # matches expected_output JSON
          "report_html": "<text report>",  # plain text used by frontend modal
          "report_pdf_url": "data:...pdf"  # base64 data URL for direct download
        }
    """
    # region agent log
    try:
        import json
        import time

        with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
            _f.write(
                json.dumps(
                    {
                        "sessionId": "1122b1",
                        "runId": "run1",
                        "hypothesisId": "H-route",
                        "location": "sentiment_routes.py:run_sentiment_analysis:entry",
                        "message": "Entered run_sentiment_analysis",
                        "data": {
                            "user_id": user_id,
                            "message_length": len(request.message or ""),
                        },
                        "timestamp": int(time.time() * 1000),
                    }
                )
                + "\n"
            )
    except Exception:
        pass
    # endregion

    try:
        # analyze_message is CPU/ML-heavy and blocking; must not run on the asyncio event loop
        # or every other request (including DB) appears stuck as "pending".
        result = await asyncio.get_running_loop().run_in_executor(
            None,
            lambda: SentimentController.analyze_message(request.message),
        )
    except ValueError as ve:
        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-route",
                            "location": "sentiment_routes.py:run_sentiment_analysis:value_error",
                            "message": "ValueError in run_sentiment_analysis",
                            "data": {"error": str(ve)},
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-route",
                            "location": "sentiment_routes.py:run_sentiment_analysis:exception",
                            "message": "Unhandled exception in run_sentiment_analysis",
                            "data": {"error": str(e)},
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        print(f"[SENTIMENT] Error running analysis: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to run sentiment analysis.")

    analysis = result.get("analysis") or {}
    report_text = result.get("report_text") or ""

    # Build PDF as a data URL so frontend can download it directly
    pdf_bytes = _build_report_pdf(report_text or "No report content available.")
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    pdf_data_url = f"data:application/pdf;base64,{pdf_b64}"

    return {
        "analysis": analysis,
        "report_html": report_text,
        "report_pdf_url": pdf_data_url,
    }

