-- Hybrid price predictor: audit trail + user feedback (PostgreSQL)
-- Depends on: users, deals (migration_add_deals_table.sql)

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

CREATE INDEX IF NOT EXISTS idx_price_predictions_user_id ON price_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_price_predictions_deal_id ON price_predictions(deal_id);
CREATE INDEX IF NOT EXISTS idx_price_predictions_created_at ON price_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_predictions_source ON price_predictions(source);

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

CREATE INDEX IF NOT EXISTS idx_price_feedback_user_id ON price_prediction_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_price_feedback_prediction_id ON price_prediction_feedback(prediction_id);
CREATE INDEX IF NOT EXISTS idx_price_feedback_deal_id ON price_prediction_feedback(deal_id);
CREATE INDEX IF NOT EXISTS idx_price_feedback_created_at ON price_prediction_feedback(created_at DESC);
