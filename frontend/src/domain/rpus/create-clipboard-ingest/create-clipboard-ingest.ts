import type { IngestItem } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export function createClipboardIngest(deps: { backendApi: BackendApiProvider; session: SessionProvider }) {
  return async function process(rawText: string): Promise<
    | { ok: true; ingest: IngestItem; duplicate: boolean }
    | { ok: false; error: string }
  > {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.createClipboardIngest(session.token, rawText);
    return result.ok
      ? { ok: true, ingest: result.value.ingest, duplicate: result.value.duplicate }
      : { ok: false, error: result.error };
  };
}
