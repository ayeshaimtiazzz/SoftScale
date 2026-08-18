"""Optional SHAP explanations (skipped if shap is not installed)."""

import logging
from typing import Any, List, Tuple

import pandas as pd

from .ml_model import build_input_row

logger = logging.getLogger(__name__)


def generate_shap_explanation(model, features: List[str], complexity: str, hours: int) -> List[Tuple[str, float]]:
    try:
        import shap
    except ImportError:
        logger.debug("shap not installed; skipping SHAP values.")
        return []

    input_df = build_input_row(features, complexity, hours)
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(input_df)
        contributions = dict(zip(input_df.columns, shap_values[0]))
        sorted_contrib = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
        return [(str(k), float(v)) for k, v in sorted_contrib[:5]]
    except Exception as e:
        logger.warning("SHAP explanation failed: %s", e)
        return []


def generate_shap_based_explanation(shap_values: List[Tuple[str, float]]) -> str:
    if not shap_values:
        return "SHAP-based detail is unavailable (optional dependency or model type)."
    top_features = [f for f, _ in shap_values[:3]]
    return (
        f"The main factors affecting price are: {', '.join(top_features)}. "
        "These features contributed the most to the predicted cost."
    )
