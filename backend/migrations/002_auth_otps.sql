-- Short-lived OTP challenges for email login.

CREATE TABLE IF NOT EXISTS auth_otps (
  email       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_expires_at ON auth_otps (expires_at);
