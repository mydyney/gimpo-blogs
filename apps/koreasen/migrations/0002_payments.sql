CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  pay_state TEXT,
  pay_url TEXT,
  receipt_url TEXT,
  raw_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_request_provider ON payments(request_id, provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment ON payments(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
