import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface UnlinkContactGpCommand {
  contact_id: string;
  gp_id: string;
}

export type UnlinkContactGpResult = { ok: true } | { ok: false; error: string };

export function unlinkContactGp(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(command: UnlinkContactGpCommand): Promise<UnlinkContactGpResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.unlinkContactGp(session.token, command);
    if (!result.ok) return { ok: false, error: result.error };

    const selection = deps.selectionStore.get();
    if (selection) {
      deps.selectionStore.set({
        ...selection,
        contact_gps: selection.contact_gps.filter(
          (link) => !(link.contact_id === command.contact_id && link.gp_id === command.gp_id),
        ),
      });
    }

    return { ok: true };
  };
}
