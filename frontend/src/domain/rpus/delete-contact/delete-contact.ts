import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface DeleteContactCommand {
  id: string;
}

export type DeleteContactResult = { ok: true } | { ok: false; error: string };

export function deleteContact(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(command: DeleteContactCommand): Promise<DeleteContactResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.deleteContact(session.token, command.id);
    if (!result.ok) return { ok: false, error: result.error };

    const selection = deps.selectionStore.get();
    if (selection) {
      deps.selectionStore.set({
        ...selection,
        contacts: selection.contacts.filter((contact) => contact.id !== command.id),
        contact_gps: selection.contact_gps.filter((link) => link.contact_id !== command.id),
      });
    }
    if (deps.selectionStore.getSelected()?.kind === "contact" && deps.selectionStore.getSelected()?.id === command.id) {
      deps.selectionStore.setSelected(null);
    }

    return { ok: true };
  };
}
