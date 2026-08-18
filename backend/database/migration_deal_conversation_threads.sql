-- Threaded deal conversations: each deal has many conversation threads; messages belong to one thread.

CREATE TABLE IF NOT EXISTS deal_conversations (
    conversation_id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_conv_threads_deal ON deal_conversations(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_conv_threads_created ON deal_conversations(created_at DESC);

ALTER TABLE deal_conversation_messages
    ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES deal_conversations(conversation_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_deal_conv_msg_thread ON deal_conversation_messages(conversation_id);

-- Backfill: one "Original thread" per deal that still has NULL conversation_id
INSERT INTO deal_conversations (deal_id, user_id, title)
SELECT DISTINCT m.deal_id, d.user_id, 'Original thread'
FROM deal_conversation_messages m
JOIN deals d ON d.deal_id = m.deal_id
WHERE m.conversation_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM deal_conversations c
    WHERE c.deal_id = m.deal_id AND c.title = 'Original thread'
  );

UPDATE deal_conversation_messages m
SET conversation_id = c.conversation_id
FROM deal_conversations c
WHERE m.conversation_id IS NULL
  AND c.deal_id = m.deal_id
  AND c.title = 'Original thread';
