CREATE TABLE IF NOT EXISTS account_deletion_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
 requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 processed_at TIMESTAMPTZ,
 error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status,requested_at);
