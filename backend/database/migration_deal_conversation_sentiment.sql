-- Deal in-app conversation + persisted sentiment analyses (run against PostgreSQL used by SoftScale)

CREATE TABLE IF NOT EXISTS deal_conversation_messages (
    message_id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    sentiment_status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_conv_deal_id ON deal_conversation_messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_conv_created ON deal_conversation_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS deal_sentiment_analyses (
    analysis_id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    conversation_message_id INTEGER REFERENCES deal_conversation_messages(message_id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_excerpt TEXT,
    analysis_json JSONB NOT NULL,
    report_text TEXT,
    status VARCHAR(32) DEFAULT 'completed',
    error_detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_sent_deal_id ON deal_sentiment_analyses(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_sent_msg_id ON deal_sentiment_analyses(conversation_message_id);
CREATE INDEX IF NOT EXISTS idx_deal_sent_created ON deal_sentiment_analyses(created_at DESC);
