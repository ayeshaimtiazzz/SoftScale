"""End-to-end: NLP features → rules → Random Forest → hybrid → explanation."""

import logging
import re
from typing import Any, Dict, List, Optional

from sklearn.ensemble import RandomForestRegressor

from .adjustments import apply_user_adjustments
from .confidence import calculate_confidence
from .explainability import generate_advanced_explanation
from .feature_extractor import (
    calculate_hours,
    detect_domain,
    estimate_complexity,
    infer_fallback_features,
    merge_description_and_user_features,
)
from .freelancer import adjust_price_for_freelancer, freelancers
from .ml_model import (
    get_feature_importance,
    load_data,
    predict_price,
    prediction_std_across_trees,
)
from .paths import DATASET_CSV
from .pricing_engine import combine_prices, estimate_price
from .shap_explainer import generate_shap_based_explanation, generate_shap_explanation

logger = logging.getLogger(__name__)

# Description quality: reject noise-only strings
_MIN_DESC_LEN = 8
_MAX_DESC_LEN = 20000


def _validate_inputs(description: str, user_features: Optional[List[str]]) -> None:
    from .feature_extractor import normalize_user_features

    has_structured = bool(normalize_user_features(user_features))
    s = str(description or "").strip()
    if not s and not has_structured:
        raise ValueError("Provide a project description and/or a non-empty `features` list.")
    if s and len(s) < _MIN_DESC_LEN and not has_structured:
        raise ValueError(
            f"Project description is too short (min {_MIN_DESC_LEN} chars) unless you pass `features`."
        )
    if len(s) > _MAX_DESC_LEN:
        raise ValueError(f"Project description exceeds {_MAX_DESC_LEN} characters.")


def _sanitize_description(text: str) -> str:
    s = re.sub(r"\s+", " ", str(text or "").strip())
    return s[:_MAX_DESC_LEN]


def run_price_prediction(
    payload: Dict[str, Any],
    model: RandomForestRegressor,
) -> Dict[str, Any]:
    """
    payload keys:
      project_description | description
      features (optional list)
      region, experience_level, freelancer_level, effort, urgency (optional)
    """
    raw_desc = payload.get("project_description") or payload.get("description") or ""
    user_features = payload.get("features")

    _validate_inputs(raw_desc, user_features)
    description = _sanitize_description(raw_desc)

    region = str(payload.get("region", "pakistan")).lower()
    experience_level = str(payload.get("experience_level", "intermediate")).lower()
    freelancer_level = str(payload.get("freelancer_level", "mid")).lower()
    if freelancer_level not in freelancers:
        freelancer_level = "mid"
    effort = float(payload.get("effort", 1.0) or 1.0)
    urgency = float(payload.get("urgency", 1.0) or 1.0)

    features = merge_description_and_user_features(description, user_features)
    if not features:
        features = infer_fallback_features(description)
    if not features:
        raise ValueError(
            "No features could be inferred. Add a richer project description or pass a `features` list "
            f"(e.g. {['login', 'dashboard']})."
        )

    domains = detect_domain(features)
    complexity = estimate_complexity(features)
    hours = calculate_hours(features)

    rule_result = estimate_price(features, domains, hours, complexity, region, experience_level)
    rule_based_price = int((rule_result["min_price"] + rule_result["max_price"]) // 2)

    ml_price = rule_based_price
    ml_error: Optional[str] = None
    tree_std = 0.0
    try:
        ml_price = predict_price(model, features, complexity, hours)
        tree_std = prediction_std_across_trees(model, features, complexity, hours)
    except Exception as e:
        ml_error = str(e)
        logger.exception("ML prediction failed, falling back to rule-based price.")

    hybrid_price = combine_prices(rule_based_price, ml_price)
    after_freelancer = adjust_price_for_freelancer(hybrid_price, freelancer_level)
    final_price = apply_user_adjustments(after_freelancer, effort=effort, urgency=urgency)

    try:
        df = load_data()
        dataset_size = len(df)
        mean_price = float(df["price"].mean()) if len(df) else 5000.0
    except Exception:
        dataset_size = 200
        mean_price = 5000.0

    confidence_score = calculate_confidence(
        features,
        dataset_size=dataset_size,
        tree_prediction_std=tree_std,
        mean_price_scale=max(mean_price, 1.0),
    )
    if ml_error:
        confidence_score = max(40.0, confidence_score - 15.0)

    importance = get_feature_importance(model)
    explanation = generate_advanced_explanation(
        features, importance, ml_price, rule_based_price, complexity
    )
    shap_vals = generate_shap_explanation(model, features, complexity, hours)
    shap_sentence = generate_shap_based_explanation(shap_vals)
    full_explanation = explanation
    if shap_vals:
        full_explanation = f"{explanation} {shap_sentence}".strip()

    feature_breakdown: Dict[str, Any] = {
        "extracted_features": features,
        "complexity": complexity,
        "complexity_numeric": {"simple": 1, "medium": 2, "complex": 3}[complexity],
        "hours": hours,
        "domains": domains,
        "rule_engine": {
            "min_price": rule_result["min_price"],
            "max_price": rule_result["max_price"],
            "hourly_rate": round(rule_result["hourly_rate"], 2),
            "base_cost": round(rule_result["base_cost"], 2),
            "regional_cost": round(rule_result["regional_cost"], 2),
            "extra_costs": rule_result["extra_cost"],
        },
        "hybrid_logic": "70% rule / 30% ML; if estimates differ by more than 3x, blend shifts toward rules.",
        "feature_importance": {k: round(v, 4) for k, v in importance.items()},
        "shap_top": [{"feature": f, "shap_value": round(v, 4)} for f, v in shap_vals],
        "shap_summary": shap_sentence,
        "freelancer_level": freelancer_level,
        "effort_multiplier": effort,
        "urgency_multiplier": urgency,
        "ml_error": ml_error,
    }

    out = {
        "final_price": int(final_price),
        "rule_based_price": int(rule_based_price),
        "ml_price": int(ml_price),
        "confidence_score": confidence_score,
        "explanation": full_explanation,
        "feature_breakdown": feature_breakdown,
        "price_range": f"{rule_result['min_price']} - {rule_result['max_price']}",
        "hybrid_price": int(hybrid_price),
        "timeline_days_hint": max(1, hours // 6),
    }

    logger.info(
        "price_prediction final=%s rule=%s ml=%s hybrid=%s features=%s",
        out["final_price"],
        rule_based_price,
        ml_price,
        hybrid_price,
        features,
    )
    return out
