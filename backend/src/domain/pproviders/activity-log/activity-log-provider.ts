import type { ActivityLogEntry, EntityType } from "../../model.js";

export interface NewActivityEntry {
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  type: string;
  payload?: Record<string, unknown>;
  follow_up_at?: string | null;
}

/**
 * Persistence abstraction for the append-only activity log.
 */
export interface ActivityLogProvider {
  append(entry: NewActivityEntry): Promise<ActivityLogEntry>;

  /** All entries for one entity, newest first. Used on demand and in tests. */
  listForEntity(entityType: EntityType, entityId: string): Promise<ActivityLogEntry[]>;
}
