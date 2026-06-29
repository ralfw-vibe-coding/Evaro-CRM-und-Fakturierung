import type { IngestItem, IngestStatus } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export function updateIngestStatus(deps: { backendApi: BackendApiProvider; session: SessionProvider }) {
  return async function process(id: string, status: IngestStatus): Promise<
    | { ok: true; ingest: IngestItem }
    | { ok: false; error: string }
  > {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.updateIngestStatus(session.token, id, status);
    return result.ok ? { ok: true, ingest: result.value.ingest } : { ok: false, error: result.error };
  };
}
