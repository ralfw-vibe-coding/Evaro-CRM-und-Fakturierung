import { randomUUID } from "node:crypto";
import type { IngestItem } from "../../model.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";
import type { IngestsProvider, NewIngestItem } from "./ingests-provider.js";

export class InMemoryIngestsProvider implements IngestsProvider {
  private readonly ingests = new Map<string, IngestItem>();

  constructor() {
    const existing = devStatePath() ? readDevState().ingests : undefined;
    if (!existing) return;
    for (const ingest of existing) this.ingests.set(ingest.id, ingest);
  }

  private hydrate(): void {
    const existing = devStatePath() ? readDevState().ingests : undefined;
    if (!existing) return;
    this.ingests.clear();
    for (const ingest of existing) this.ingests.set(ingest.id, ingest);
  }

  private persist(): void {
    writeDevState({ ingests: [...this.ingests.values()] });
  }

  async insert(input: NewIngestItem): Promise<IngestItem> {
    this.hydrate();
    const now = new Date().toISOString();
    const item: IngestItem = {
      id: randomUUID(),
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      source_label: input.source_label ?? null,
      raw_text: input.raw_text,
      analysis: structuredClone(input.analysis ?? null),
      status: input.status ?? "pending",
      error: input.error ?? null,
      created_at: now,
      updated_at: now,
    };
    this.ingests.set(item.id, item);
    this.persist();
    return structuredClone(item);
  }

  async list(): Promise<IngestItem[]> {
    this.hydrate();
    return [...this.ingests.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((item) => structuredClone(item));
  }

  async countPending(): Promise<number> {
    this.hydrate();
    return [...this.ingests.values()].filter((item) => item.status === "pending").length;
  }

  async findBySource(sourceType: IngestItem["source_type"], sourceId: string): Promise<IngestItem | null> {
    this.hydrate();
    const found = [...this.ingests.values()].find(
      (item) => item.source_type === sourceType && item.source_id === sourceId,
    );
    return found ? structuredClone(found) : null;
  }

  async updateStatus(id: string, status: IngestItem["status"]): Promise<IngestItem | null> {
    this.hydrate();
    const existing = this.ingests.get(id);
    if (!existing) return null;
    const updated = { ...existing, status, updated_at: new Date().toISOString() };
    this.ingests.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }
}
