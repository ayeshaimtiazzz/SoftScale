"""Resolved paths for datasets, persisted models, and feedback logs."""

from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent
DATASETS_DIR = PACKAGE_ROOT / "datasets"
MODEL_DIR = PACKAGE_ROOT / "model"

DATASET_CSV = DATASETS_DIR / "projects_dataset.csv"
MODEL_JOBLIB = MODEL_DIR / "random_forest_price.joblib"
FEEDBACK_JSONL = DATASETS_DIR / "feedback_log.jsonl"
# Rows appended from user feedback (optional retraining material)
AUGMENTED_DATASET_CSV = DATASETS_DIR / "feedback_augmented.csv"
