CREATE TABLE IF NOT EXISTS ingests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type  TEXT NOT NULL,
  source_id    TEXT,
  source_label TEXT,
  raw_text     TEXT NOT NULL,
  analysis     JSONB,
  status       TEXT NOT NULL DEFAULT 'pending',
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ingests_source
  ON ingests (source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingests_status ON ingests (status);
CREATE INDEX IF NOT EXISTS idx_ingests_created_at ON ingests (created_at);
