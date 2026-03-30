"""Random Forest price model — training data and inference aligned on ALL_FEATURES."""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from .constants import ALL_FEATURES
from .paths import AUGMENTED_DATASET_CSV, DATASET_CSV, MODEL_DIR, MODEL_JOBLIB

logger = logging.getLogger(__name__)

_COMPLEXITY_MAP = {"simple": 1, "medium": 2, "complex": 3}


def load_data():
    parts = []
    if DATASET_CSV.is_file():
        parts.append(pd.read_csv(DATASET_CSV))
    if AUGMENTED_DATASET_CSV.is_file():
        parts.append(pd.read_csv(AUGMENTED_DATASET_CSV))
    if not parts:
        raise FileNotFoundError(f"Dataset not found: {DATASET_CSV}")
    if len(parts) == 1:
        return parts[0]
    return pd.concat(parts, ignore_index=True)


def preprocess(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    for f in ALL_FEATURES:
        df[f] = df["features"].apply(lambda x: 1 if f in str(x) else 0)
    df["complexity"] = df["complexity"].map(_COMPLEXITY_MAP)
    X = df[ALL_FEATURES + ["complexity", "hours"]]
    y = df["price"]
    return X, y


def train_model() -> RandomForestRegressor:
    df = load_data()
    X, y = preprocess(df.copy())
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    logger.info("Price RandomForest trained on %s rows.", len(df))
    return model


def _save_model(model: RandomForestRegressor) -> None:
    try:
        import joblib

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_JOBLIB)
        logger.info("Saved model to %s", MODEL_JOBLIB)
    except Exception as e:
        logger.warning("Could not persist model: %s", e)


def load_or_train_model(*, force_retrain: bool = False) -> RandomForestRegressor:
    if not force_retrain and MODEL_JOBLIB.is_file():
        try:
            import joblib

            m = joblib.load(MODEL_JOBLIB)
            logger.info("Loaded price model from %s", MODEL_JOBLIB)
            return m
        except Exception as e:
            logger.warning("Failed to load %s, retraining: %s", MODEL_JOBLIB, e)
    model = train_model()
    _save_model(model)
    return model


def build_input_row(features: List[str], complexity: str, hours: int) -> pd.DataFrame:
    row = [1 if f in features else 0 for f in ALL_FEATURES]
    row.append(_COMPLEXITY_MAP.get(complexity, 2))
    row.append(int(hours))
    return pd.DataFrame([row], columns=ALL_FEATURES + ["complexity", "hours"])


def predict_price(model: RandomForestRegressor, features: List[str], complexity: str, hours: int) -> int:
    input_df = build_input_row(features, complexity, hours)
    prediction = model.predict(input_df)[0]
    return int(max(0, round(prediction)))


def prediction_std_across_trees(model: RandomForestRegressor, features: List[str], complexity: str, hours: int) -> float:
    """Dispersion of tree predictions — lower is more certain."""
    input_df = build_input_row(features, complexity, hours)
    preds = np.array([t.predict(input_df.values)[0] for t in model.estimators_])
    return float(np.std(preds))


def get_feature_importance(model: RandomForestRegressor) -> Dict[str, float]:
    feature_names = ALL_FEATURES + ["complexity", "hours"]
    importance = model.feature_importances_
    return {k: float(abs(v)) for k, v in zip(feature_names, importance)}


def retrain_and_save() -> RandomForestRegressor:
    """Train from current CSV and overwrite persisted model (feedback append + periodic retrain)."""
    if MODEL_JOBLIB.is_file():
        try:
            MODEL_JOBLIB.unlink()
        except OSError:
            pass
    return load_or_train_model(force_retrain=True)
