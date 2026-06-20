-- User-scoped API keys --------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;

