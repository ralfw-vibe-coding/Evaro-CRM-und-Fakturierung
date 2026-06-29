import type pg from "pg";
import type { IngestItem, IngestSourceType, IngestStatus } from "../../model.js";
import { getPool } from "../postgres/pool.js";
import type { IngestsProvider, NewIngestItem } from "./ingests-provider.js";

interface IngestRow {
  id: string;
  source_type: IngestSourceType;
  source_id: string | null;
  source_label: string | null;
  raw_text: string;
  analysis: unknown;
  status: IngestStatus;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

function toIngest(row: IngestRow): IngestItem {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export class PostgresIngestsProvider implements IngestsProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async insert(input: NewIngestItem): Promise<IngestItem> {
    const { rows } = await this.pool.query<IngestRow>(
      `INSERT INTO ingests (source_type, source_id, source_label, raw_text, analysis, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, source_type, source_id, source_label, raw_text, analysis, status, error, created_at, updated_at`,
      [
        input.source_type,
        input.source_id ?? null,
        input.source_label ?? null,
        input.raw_text,
        input.analysis ?? null,
        input.status ?? "pending",
        input.error ?? null,
      ],
    );
    return toIngest(rows[0]);
  }

  async list(): Promise<IngestItem[]> {
    const { rows } = await this.pool.query<IngestRow>(
      `SELECT id, source_type, source_id, source_label, raw_text, analysis, status, error, created_at, updated_at
       FROM ingests
       ORDER BY created_at DESC`,
    );
    return rows.map(toIngest);
  }

  async countPending(): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM ingests WHERE status = 'pending'`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async findBySource(sourceType: IngestSourceType, sourceId: string): Promise<IngestItem | null> {
    const { rows } = await this.pool.query<IngestRow>(
      `SELECT id, source_type, source_id, source_label, raw_text, analysis, status, error, created_at, updated_at
       FROM ingests
       WHERE source_type = $1 AND source_id = $2
       LIMIT 1`,
      [sourceType, sourceId],
    );
    return rows[0] ? toIngest(rows[0]) : null;
  }

  async updateStatus(id: string, status: IngestStatus): Promise<IngestItem | null> {
    const { rows } = await this.pool.query<IngestRow>(
      `UPDATE ingests
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, source_type, source_id, source_label, raw_text, analysis, status, error, created_at, updated_at`,
      [status, id],
    );
    return rows[0] ? toIngest(rows[0]) : null;
  }
}
