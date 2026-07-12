CREATE TABLE IF NOT EXISTS email_auth_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'signup')),
  name TEXT,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes_lookup ON email_auth_codes(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_codes_expiry ON email_auth_codes(expires_at);
