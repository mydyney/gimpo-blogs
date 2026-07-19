DROP INDEX IF EXISTS idx_payments_request_provider;

CREATE INDEX IF NOT EXISTS idx_payments_request_provider
  ON payments(request_id, provider, created_at DESC);
