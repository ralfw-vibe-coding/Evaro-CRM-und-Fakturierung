-- Global application settings, currently used for invoicing print data.

CREATE TABLE IF NOT EXISTS app_settings (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
