"""Persist price predictions and feedback (DB mirror of hybrid pricing module)."""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class PricePredictionRepository:
    @staticmethod
    def ensure_tables(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS price_predictions (
                    prediction_id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
                    source VARCHAR(64) NOT NULL DEFAULT 'predict_price_api',
                    project_description TEXT,
                    input_json JSONB NOT NULL DEFAULT '{}',
                    result_json JSONB NOT NULL,
                    final_price INTEGER,
                    rule_based_price INTEGER,
                    ml_price INTEGER,
                    confidence_score NUMERIC(8, 2),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_predictions_user_id
                ON price_predictions(user_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_predictions_deal_id
                ON price_predictions(deal_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_predictions_created_at
                ON price_predictions(created_at DESC);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_predictions_source
                ON price_predictions(source);
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS price_prediction_feedback (
                    feedback_id SERIAL PRIMARY KEY,
                    prediction_id INTEGER REFERENCES price_predictions(prediction_id) ON DELETE SET NULL,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
                    was_correct BOOLEAN,
                    predicted_price NUMERIC(14, 2) NOT NULL,
                    adjusted_price NUMERIC(14, 2),
                    notes TEXT,
                    features_json JSONB,
                    complexity VARCHAR(32),
                    hours INTEGER,
                    augmented_training_row BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_feedback_user_id
                ON price_prediction_feedback(user_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_feedback_prediction_id
                ON price_prediction_feedback(prediction_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_feedback_deal_id
                ON price_prediction_feedback(deal_id);
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_price_feedback_created_at
                ON price_prediction_feedback(created_at DESC);
                """
            )
            conn.commit()

    @staticmethod
    def insert_prediction(
        conn,
        *,
        user_id: int,
        deal_id: Optional[int],
        source: str,
        project_description: Optional[str],
        input_json: Dict[str, Any],
        result_json: Dict[str, Any],
    ) -> int:
        inp = json.dumps(input_json or {}, default=str)
        out = json.dumps(result_json or {}, default=str)
        final_p = result_json.get("final_price")
        rule_p = result_json.get("rule_based_price")
        ml_p = result_json.get("ml_price")
        conf = result_json.get("confidence_score")
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO price_predictions (
                    user_id, deal_id, source, project_description,
                    input_json, result_json, final_price, rule_based_price,
                    ml_price, confidence_score
                ) VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s)
                RETURNING prediction_id
                """,
                (
                    user_id,
                    deal_id,
                    source[:64] if source else "unknown",
                    project_description,
                    inp,
                    out,
                    int(final_p) if final_p is not None else None,
                    int(rule_p) if rule_p is not None else None,
                    int(ml_p) if ml_p is not None else None,
                    float(conf) if conf is not None else None,
                ),
            )
            pid = cur.fetchone()[0]
            conn.commit()
            return int(pid)

    @staticmethod
    def insert_feedback(
        conn,
        *,
        user_id: int,
        prediction_id: Optional[int],
        deal_id: Optional[int],
        was_correct: Optional[bool],
        predicted_price: float,
        adjusted_price: Optional[float],
        notes: Optional[str],
        features: Optional[List[str]],
        complexity: Optional[str],
        hours: Optional[int],
        augmented_training_row: bool,
    ) -> int:
        features_payload = json.dumps(features or [], default=str)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO price_prediction_feedback (
                    prediction_id, user_id, deal_id, was_correct,
                    predicted_price, adjusted_price, notes,
                    features_json, complexity, hours, augmented_training_row
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING feedback_id
                """,
                (
                    prediction_id,
                    user_id,
                    deal_id,
                    was_correct,
                    predicted_price,
                    adjusted_price,
                    notes[:8000] if notes else None,
                    features_payload,
                    complexity[:32] if complexity else None,
                    hours,
                    augmented_training_row,
                ),
            )
            fid = cur.fetchone()[0]
            conn.commit()
            return int(fid)

    @staticmethod
    def list_by_deal(conn, deal_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    prediction_id, user_id, deal_id, source, project_description, input_json, result_json,
                    final_price, rule_based_price, ml_price, confidence_score, created_at
                FROM price_predictions
                WHERE deal_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (deal_id, limit),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            out: List[Dict[str, Any]] = []
            for row in rows:
                rec = dict(zip(cols, row))
                if rec.get("created_at"):
                    rec["created_at"] = rec["created_at"].isoformat()
                out.append(rec)
            return out


def persist_prediction_safe(
    *,
    user_id: int,
    deal_id: Optional[int],
    source: str,
    payload: Dict[str, Any],
    result: Dict[str, Any],
) -> Optional[int]:
    """Insert prediction row; returns None if DB unavailable (API still succeeds)."""
    from data import get_db

    conn = get_db()
    try:
        PricePredictionRepository.ensure_tables(conn)
        desc = (payload.get("project_description") or "").strip() or None
        input_json = {k: v for k, v in payload.items() if k != "project_description"}
        return PricePredictionRepository.insert_prediction(
            conn,
            user_id=user_id,
            deal_id=deal_id,
            source=source,
            project_description=desc,
            input_json=input_json,
            result_json=result,
        )
    except Exception as e:
        logger.warning("Could not persist price prediction: %s", e)
        return None
    finally:
        conn.close()


def persist_feedback_safe(
    *,
    user_id: int,
    prediction_id: Optional[int],
    deal_id: Optional[int],
    was_correct: Optional[bool],
    predicted_price: float,
    adjusted_price: Optional[float],
    notes: Optional[str],
    features: Optional[List[str]],
    complexity: Optional[str],
    hours: Optional[int],
    augmented_training_row: bool,
) -> Optional[int]:
    from data import get_db

    conn = get_db()
    try:
        PricePredictionRepository.ensure_tables(conn)
        return PricePredictionRepository.insert_feedback(
            conn,
            user_id=user_id,
            prediction_id=prediction_id,
            deal_id=deal_id,
            was_correct=was_correct,
            predicted_price=predicted_price,
            adjusted_price=adjusted_price,
            notes=notes,
            features=features,
            complexity=complexity,
            hours=hours,
            augmented_training_row=augmented_training_row,
        )
    except Exception as e:
        logger.warning("Could not persist price feedback: %s", e)
        return None
    finally:
        conn.close()


def attach_prediction_to_deal_safe(
    *,
    user_id: int,
    deal_id: Optional[int],
    prediction_id: Optional[int],
    result: Dict[str, Any],
) -> bool:
    """
    Store latest pricing snapshot directly on deals.ai_insights.
    This links prediction data with the deal record without schema changes.
    """
    if not deal_id or not prediction_id:
        return False

    from data import get_db

    conn = get_db()
    try:
        snapshot = json.dumps(
            {
                "prediction_id": prediction_id,
                "final_price": result.get("final_price"),
                "rule_based_price": result.get("rule_based_price"),
                "ml_price": result.get("ml_price"),
                "confidence_score": result.get("confidence_score"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            default=str,
        )
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE deals
                SET ai_insights =
                        COALESCE(ai_insights, '{}'::jsonb)
                        || jsonb_build_object('price_prediction_latest', %s::jsonb),
                    updated_at = CURRENT_TIMESTAMP
                WHERE deal_id = %s AND user_id = %s
                """,
                (snapshot, deal_id, user_id),
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning("Could not link prediction to deal ai_insights: %s", e)
        return False
    finally:
        conn.close()
