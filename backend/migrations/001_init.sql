-- Evaro CRM — initial schema
-- See requirements/crm-briefing.md for the conceptual model.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  abbr       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active     BOOLEAN NOT NULL DEFAULT true,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts (active);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts (updated_at);

-- Business Partners -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_partners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  types      TEXT[] NOT NULL DEFAULT '{}',
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bp_updated_at ON business_partners (updated_at);

-- Contact <-> Business Partner (n:m) ------------------------------------------
CREATE TABLE IF NOT EXISTS contact_gp (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  gp_id      UUID NOT NULL REFERENCES business_partners(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  "primary"  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, gp_id)
);

-- At most one primary business partner per contact.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_gp_primary
  ON contact_gp (contact_id) WHERE "primary" = true;

-- Activity log (append-only) --------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL,            -- 'contact' | 'business_partner'
  entity_id    UUID NOT NULL,
  user_id      UUID NOT NULL REFERENCES users(id),
  type         TEXT NOT NULL,            -- past tense event name
  payload      JSONB NOT NULL DEFAULT '{}',
  follow_up_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_follow_up ON activity_log (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log (created_at);
