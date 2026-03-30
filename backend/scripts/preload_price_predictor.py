"""Train or load the hybrid price predictor (Random Forest + rules dataset).

Ensures `ai/price_predictor/model/random_forest_price.joblib` exists after run
(when training succeeds). Use in CI, Docker build, or before demos.

Usage (from repository `backend/` directory):

    py -3 scripts/preload_price_predictor.py
    py -3 scripts/preload_price_predictor.py --check-only
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))


def main() -> int:
    parser = argparse.ArgumentParser(description="Preload SoftScale price predictor model.")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only verify dataset (and optional joblib) exist; do not train/load into memory.",
    )
    args = parser.parse_args()

    from ai.price_predictor.paths import DATASET_CSV, MODEL_JOBLIB
    from ai.price_predictor.service import get_price_model

    if not DATASET_CSV.is_file():
        print(f"[price-predictor] FAIL: dataset missing: {DATASET_CSV}")
        return 1

    if args.check_only:
        has_joblib = MODEL_JOBLIB.is_file()
        print(f"[price-predictor] OK: dataset {DATASET_CSV}")
        print(f"[price-predictor] joblib: {'present' if has_joblib else 'absent (will train on warm load)'}")
        return 0

    print("[price-predictor] Loading or training Random Forest…")
    get_price_model()
    print(f"[price-predictor] OK: model ready (see {MODEL_JOBLIB})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
