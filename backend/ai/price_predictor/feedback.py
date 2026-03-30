"""Append-only feedback log for optional retraining."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import csv

from .feature_extractor import detect_domain
from .paths import AUGMENTED_DATASET_CSV, FEEDBACK_JSONL

logger = logging.getLogger(__name__)

_feedback_memory: List[Dict[str, Any]] = []


def _append_jsonl(path: Path, record: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(line)


def record_feedback(
    *,
    predicted_price: float,
    was_correct: Optional[bool] = None,
    adjusted_price: Optional[float] = None,
    notes: Optional[str] = None,
    request_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Store user feedback; if adjusted_price is set, error delta is available for bias correction."""
    rec: Dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "predicted_price": predicted_price,
        "was_correct": was_correct,
        "adjusted_price": adjusted_price,
        "notes": notes,
        "request_id": request_id,
    }
    if extra:
        rec["extra"] = extra
    if adjusted_price is not None:
        rec["error_delta"] = float(adjusted_price) - float(predicted_price)
    _feedback_memory.append(rec)
    try:
        _append_jsonl(FEEDBACK_JSONL, rec)
    except OSError as e:
        logger.error("Failed to write feedback log: %s", e)
    return {"stored": True, "record": rec}


def get_recent_feedback(limit: int = 50) -> List[Dict[str, Any]]:
    return _feedback_memory[-limit:]


def append_augmented_training_row(
    *,
    features: List[str],
    complexity: str,
    hours: int,
    price: float,
) -> None:
    """Append one row in the same shape as projects_dataset.csv for later merge/retrain."""
    if not features or price is None:
        return
    domains = detect_domain(features)
    domain_str = ",".join(domains)
    row = {
        "features": ";".join(features),
        "complexity": complexity,
        "hours": int(hours),
        "domain": domain_str,
        "price": int(round(price)),
    }
    AUGMENTED_DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    new_file = not AUGMENTED_DATASET_CSV.is_file()
    with open(AUGMENTED_DATASET_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(row.keys()))
        if new_file:
            w.writeheader()
        w.writerow(row)
    logger.info("Appended augmented training row to %s", AUGMENTED_DATASET_CSV)
