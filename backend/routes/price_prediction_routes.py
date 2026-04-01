"""Price prediction API: hybrid rules + Random Forest + optional feedback."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field

from controllers import DealController
from data import get_db
from data.price_prediction_repository import (
    PricePredictionRepository,
    persist_feedback_safe,
    persist_prediction_safe,
)
from data.deal_activity_repository import log_deal_activity_safe
from middleware import get_current_user

logger = logging.getLogger("ai.price_prediction.routes")

router = APIRouter(prefix="/api", tags=["price-prediction"])

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="price_predictor")


class PredictPriceRequest(BaseModel):
    """User input for hybrid pricing."""

    project_description: Optional[str] = Field(
        None,
        description="Free-text project scope; can be omitted if `features` is non-empty.",
    )
    description: Optional[str] = Field(
        None,
        description="Alias for project_description (backward compatibility).",
    )
    features: Optional[List[str]] = Field(
        None,
        description="Optional structured features, e.g. login, dashboard, api integration.",
    )
    region: str = "pakistan"
    experience_level: str = "intermediate"
    freelancer_level: str = "mid"
    effort: float = 1.0
    urgency: float = 1.0


class PriceFeedbackRequest(BaseModel):
    was_correct: Optional[bool] = None
    adjusted_price: Optional[float] = None
    notes: Optional[str] = None
    predicted_price: float
    request_id: Optional[str] = None
    prediction_id: Optional[int] = None
    deal_id: Optional[int] = None
    # Optional context to append a training row when user supplies a fair price
    features: Optional[List[str]] = None
    complexity: Optional[str] = None
    hours: Optional[int] = None


def _payload_from_request(body: PredictPriceRequest) -> Dict[str, Any]:
    d = body.model_dump(exclude_none=False)
    desc = d.pop("project_description", None) or d.pop("description", None)
    if desc is not None:
        d["project_description"] = desc
    return d


@router.get("/predict-price/health")
def price_predict_health(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """Lightweight check that the package and dataset are reachable."""
    from ai.price_predictor.paths import DATASET_CSV, MODEL_JOBLIB

    return {
        "ok": True,
        "dataset_exists": DATASET_CSV.is_file(),
        "persisted_model_exists": MODEL_JOBLIB.is_file(),
    }


@router.post("/predict-price")
async def predict_price_endpoint(
    body: PredictPriceRequest = Body(...),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    logger.info("predict-price request user_id=%s", user_id)

    def _run() -> Dict[str, Any]:
        from ai.price_predictor.pipeline import run_price_prediction
        from ai.price_predictor.service import get_price_model

        model = get_price_model()
        return run_price_prediction(_payload_from_request(body), model)

    try:
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _run),
            timeout=120.0,
        )
        payload = _payload_from_request(body)
        prediction_id = persist_prediction_safe(
            user_id=user_id,
            deal_id=None,
            source="predict_price_api",
            payload=payload,
            result=result,
        )
        return {"success": True, "prediction_id": prediction_id, **result}
    except ValueError as e:
        logger.warning("predict-price validation: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except asyncio.TimeoutError as e:
        logger.error("predict-price timed out")
        raise HTTPException(status_code=504, detail="Price prediction timed out.") from e
    except Exception as e:
        logger.exception("predict-price failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Price prediction failed. Check logs or model/dataset paths.",
        ) from e


@router.post("/predict-price/feedback")
def price_feedback_endpoint(
    body: PriceFeedbackRequest = Body(...),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    from ai.price_predictor import feedback as feedback_mod

    if body.prediction_id is not None:
        conn = get_db()
        try:
            PricePredictionRepository.ensure_tables(conn)
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id FROM price_predictions WHERE prediction_id = %s",
                    (body.prediction_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="prediction_id not found")
                if row[0] != user_id:
                    raise HTTPException(status_code=403, detail="Not allowed for this prediction")
        finally:
            conn.close()

    if body.deal_id is not None:
        DealController.get_deal(str(body.deal_id), user_id)

    logger.info(
        "predict-price feedback user_id=%s prediction_id=%s correct=%s",
        user_id,
        body.prediction_id,
        body.was_correct,
    )
    augmented = False
    if body.adjusted_price is not None and body.features:
        try:
            feedback_mod.append_augmented_training_row(
                features=body.features,
                complexity=body.complexity or "medium",
                hours=int(body.hours or 1),
                price=float(body.adjusted_price),
            )
            augmented = True
        except Exception as e:
            logger.warning("Could not append augmented row: %s", e)

    feedback_id = persist_feedback_safe(
        user_id=user_id,
        prediction_id=body.prediction_id,
        deal_id=body.deal_id,
        was_correct=body.was_correct,
        predicted_price=float(body.predicted_price),
        adjusted_price=float(body.adjusted_price) if body.adjusted_price is not None else None,
        notes=body.notes,
        features=body.features,
        complexity=body.complexity,
        hours=body.hours,
        augmented_training_row=augmented,
    )
    if body.deal_id:
        log_deal_activity_safe(
            deal_id=body.deal_id,
            user_id=user_id,
            event_type="price_feedback_submitted",
            title="Pricing feedback submitted",
            description=f"Predicted {body.predicted_price}; adjusted {body.adjusted_price}",
            metadata={"prediction_id": body.prediction_id, "feedback_id": feedback_id},
        )
    return {
        "success": True,
        "feedback_id": feedback_id,
        "augmented_dataset": augmented,
        "stored": feedback_id is not None,
        "request_id": body.request_id,
    }


@router.post("/predict-price/retrain")
def price_retrain_endpoint(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """Regenerate Random Forest from current CSV and persist to model/."""
    from ai.price_predictor.ml_model import retrain_and_save
    from ai.price_predictor.service import reset_model_cache

    try:
        retrain_and_save()
        reset_model_cache()
    except Exception as e:
        logger.exception("predict-price retrain failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
    logger.info("predict-price retrain completed user_id=%s", user_id)
    return {"success": True, "message": "Model retrained and cache cleared."}
