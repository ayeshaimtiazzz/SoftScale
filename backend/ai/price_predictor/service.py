"""Lazy-loaded Random Forest for the price predictor (thread-safe singleton)."""

import logging
import threading
from typing import Optional

from sklearn.ensemble import RandomForestRegressor

from .ml_model import load_or_train_model

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model: Optional[RandomForestRegressor] = None


def get_price_model() -> RandomForestRegressor:
    global _model
    with _lock:
        if _model is None:
            _model = load_or_train_model()
            logger.info("Price prediction model ready.")
        return _model


def reset_model_cache() -> None:
    """After retraining, clear cache so next request loads new weights."""
    global _model
    with _lock:
        _model = None
