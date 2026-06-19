import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export type LoadSelectionResult = { ok: true } | { ok: false; error: string };

export interface LoadSelectionDeps {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}

/**
 * RPU: fetch the initial selection from the backend and hold it as the
 * frontend's own domain state. Later, incoming polled changes will be merged
 * into the selection store here instead of a full reload.
 */
export function loadSelection(deps: LoadSelectionDeps) {
  return async function process(): Promise<LoadSelectionResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.loadSelection(session.token);
    if (!result.ok) return { ok: false, error: result.error };

    deps.selectionStore.set(result.value);
    return { ok: true };
  };
}
