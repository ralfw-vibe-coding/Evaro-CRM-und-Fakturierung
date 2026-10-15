import type pg from "pg";
import type { AppSettings } from "../../model.js";
import { getPool } from "../postgres/pool.js";
import type { AppSettingsProvider, AppSettingsUpdate } from "./app-settings-provider.js";
import { normalizeInvoicingSettings } from "../../invoicing-settings.js";

interface AppSettingsRow {
  data: unknown;
  updated_at: Date;
}

function toSettings(row?: AppSettingsRow): AppSettings {
  if (!row) return { invoicing: {}, updated_at: null };
  const data = row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
  return {
    invoicing: normalizeInvoicingSettings(data.invoicing),
    updated_at: row.updated_at.toISOString(),
  };
}

export class PostgresAppSettingsProvider implements AppSettingsProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async get(): Promise<AppSettings> {
    const { rows } = await this.pool.query<AppSettingsRow>(
      `SELECT data, updated_at FROM app_settings WHERE id = 'global'`,
    );
    return toSettings(rows[0]);
  }

  async update(input: AppSettingsUpdate): Promise<AppSettings> {
    const data = { invoicing: normalizeInvoicingSettings(input.invoicing) };
    const { rows } = await this.pool.query<AppSettingsRow>(
      `INSERT INTO app_settings (id, data, updated_at)
       VALUES ('global', $1, now())
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = now()
       RETURNING data, updated_at`,
      [data],
    );
    return toSettings(rows[0]);
  }
}
