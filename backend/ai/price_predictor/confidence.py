"""Confidence score from feature coverage, training data size, and forest dispersion."""

from typing import List


def calculate_confidence(
    features: List[str],
    dataset_size: int,
    tree_prediction_std: float = 0.0,
    mean_price_scale: float = 5000.0,
) -> float:
    """
    Returns 0–100. Higher when more signals are present, more training rows, and trees agree.
    """
    feature_score = min(len(features) * 15, 45)
    data_score = min(dataset_size / 4, 30)

    # Normalize tree std vs typical price scale (higher std → lower stability)
    if mean_price_scale <= 0:
        stability_score = 15.0
    else:
        rel = tree_prediction_std / mean_price_scale
        stability_score = max(0.0, 25.0 * (1.0 - min(rel * 5.0, 1.0)))

    raw = feature_score + data_score + stability_score
    return float(max(40.0, min(round(raw, 1), 95.0)))
