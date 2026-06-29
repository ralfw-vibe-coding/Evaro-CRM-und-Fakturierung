import type { IngestItem, IngestSourceType, IngestStatus } from "../../model.js";

export interface NewIngestItem {
  source_type: IngestSourceType;
  source_id?: string | null;
  source_label?: string | null;
  raw_text: string;
  analysis?: unknown;
  status?: IngestStatus;
  error?: string | null;
}

export interface IngestsProvider {
  insert(input: NewIngestItem): Promise<IngestItem>;
  list(): Promise<IngestItem[]>;
  countPending(): Promise<number>;
  findBySource(sourceType: IngestSourceType, sourceId: string): Promise<IngestItem | null>;
  updateStatus(id: string, status: IngestStatus): Promise<IngestItem | null>;
}
