import type { IngestItem, IngestStatus } from "../../model.js";
import type { IngestsProvider } from "../../pproviders/ingests/ingests-provider.js";

export type UpdateIngestStatusResult =
  | { ok: true; ingest: IngestItem }
  | { ok: false; error: string };

export function updateIngestStatus(deps: { ingests: IngestsProvider }) {
  return async function process(command: { id: string; status: IngestStatus }): Promise<UpdateIngestStatusResult> {
    if (!["pending", "accepted", "ignored", "error"].includes(command.status)) {
      return { ok: false, error: "Ungültiger Ingest-Status." };
    }
    const ingest = await deps.ingests.updateStatus(command.id, command.status);
    if (!ingest) return { ok: false, error: "Ingest nicht gefunden." };
    return { ok: true, ingest };
  };
}
