import type pg from "pg";
import type { ActivityLogEntry, EntityType } from "../../model.js";
import type { ActivityLogProvider, NewActivityEntry } from "./activity-log-provider.js";
import { getPool } from "../postgres/pool.js";

interface ActivityRow {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  follow_up_at: Date | null;
  created_at: Date;
}

function toEntry(row: ActivityRow): ActivityLogEntry {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    user_id: row.user_id,
    type: row.type,
    payload: row.payload,
    follow_up_at: row.follow_up_at ? row.follow_up_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  };
}

export class PostgresActivityLogProvider implements ActivityLogProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async append(entry: NewActivityEntry): Promise<ActivityLogEntry> {
    const { rows } = await this.pool.query<ActivityRow>(
      `INSERT INTO activity_log (entity_type, entity_id, user_id, type, payload, follow_up_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, entity_type, entity_id, user_id, type, payload, follow_up_at, created_at`,
      [
        entry.entity_type,
        entry.entity_id,
        entry.user_id,
        entry.type,
        entry.payload ?? {},
        entry.follow_up_at ?? null,
      ],
    );
    return toEntry(rows[0]);
  }

  async listForEntity(entityType: EntityType, entityId: string): Promise<ActivityLogEntry[]> {
    const { rows } = await this.pool.query<ActivityRow>(
      `SELECT id, entity_type, entity_id, user_id, type, payload, follow_up_at, created_at
       FROM activity_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId],
    );
    return rows.map(toEntry);
  }
}
