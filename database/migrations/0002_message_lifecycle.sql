ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_sender_client_id ON messages(sender_id, client_message_id) WHERE client_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS message_deliveries (message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(message_id,user_id));
CREATE INDEX IF NOT EXISTS idx_message_deliveries_user ON message_deliveries(user_id,delivered_at DESC);