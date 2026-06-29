import type { BackendApiProvider, IngestListResult } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export function loadIngests(deps: { backendApi: BackendApiProvider; session: SessionProvider }) {
  return async function process(): Promise<
    | { ok: true; result: IngestListResult }
    | { ok: false; error: string }
  > {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.loadIngests(session.token);
    return result.ok ? { ok: true, result: result.value } : { ok: false, error: result.error };
  };
}
