-- Deal activity event ledger for CRM timeline
-- Depends on: users, deals

CREATE TABLE IF NOT EXISTS deal_activity_events (
    activity_id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_activity_deal_id ON deal_activity_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_user_id ON deal_activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_type ON deal_activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_deal_activity_created ON deal_activity_events(created_at DESC);
