-- Evaro CRM — invoices and global payment terms

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner_id UUID NOT NULL REFERENCES business_partners(id),
  status              TEXT NOT NULL DEFAULT 'draft',
  invoice_number      TEXT,
  invoice_date        DATE,
  vat_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  gp_snapshot         JSONB NOT NULL,
  data                JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_bp ON invoices (business_partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON invoices (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_invoice_number
  ON invoices (invoice_number) WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_terms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL UNIQUE,
  template   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
