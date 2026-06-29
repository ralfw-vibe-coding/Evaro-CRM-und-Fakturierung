import type { IngestItem } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export function checkEmailIngest(deps: { backendApi: BackendApiProvider; session: SessionProvider }) {
  return async function process(): Promise<
    | { ok: true; imported: IngestItem[]; duplicates: number }
    | { ok: false; error: string }
  > {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.checkEmailIngest(session.token);
    return result.ok
      ? { ok: true, imported: result.value.imported, duplicates: result.value.duplicates }
      : { ok: false, error: result.error };
  };
}
