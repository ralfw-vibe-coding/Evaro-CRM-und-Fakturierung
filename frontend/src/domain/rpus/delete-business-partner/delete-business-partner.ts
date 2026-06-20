import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface DeleteBusinessPartnerCommand {
  id: string;
}

export type DeleteBusinessPartnerResult = { ok: true } | { ok: false; error: string };

export function deleteBusinessPartner(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(command: DeleteBusinessPartnerCommand): Promise<DeleteBusinessPartnerResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.deleteBusinessPartner(session.token, command.id);
    if (!result.ok) return { ok: false, error: result.error };

    const selection = deps.selectionStore.get();
    if (selection) {
      deps.selectionStore.set({
        ...selection,
        business_partners: selection.business_partners.filter((bp) => bp.id !== command.id),
        contact_gps: selection.contact_gps.filter((link) => link.gp_id !== command.id),
      });
    }
    if (
      deps.selectionStore.getSelected()?.kind === "business_partner" &&
      deps.selectionStore.getSelected()?.id === command.id
    ) {
      deps.selectionStore.setSelected(null);
    }

    return { ok: true };
  };
}
