import { randomUUID } from "node:crypto";
import type { ActivityLogEntry, EntityType } from "../../model.js";
import type { ActivityLogProvider, NewActivityEntry } from "./activity-log-provider.js";

export class InMemoryActivityLogProvider implements ActivityLogProvider {
  private readonly entries: ActivityLogEntry[] = [];

  async append(entry: NewActivityEntry): Promise<ActivityLogEntry> {
    const stored: ActivityLogEntry = {
      id: randomUUID(),
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      user_id: entry.user_id,
      type: entry.type,
      payload: structuredClone(entry.payload ?? {}),
      follow_up_at: entry.follow_up_at ?? null,
      created_at: new Date().toISOString(),
    };
    this.entries.push(stored);
    return structuredClone(stored);
  }

  async listForEntity(entityType: EntityType, entityId: string): Promise<ActivityLogEntry[]> {
    return this.entries
      .filter((e) => e.entity_type === entityType && e.entity_id === entityId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((e) => structuredClone(e));
  }
}
