import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { Contact, ContactData } from "@/domain/model";

export interface UpdateContactCommand {
  id: string;
  data: ContactData;
  active?: boolean;
}

export type UpdateContactResult =
  | { ok: true; contact: Contact; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface UpdateContactDeps {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}

/**
 * RPU: save edits to an existing contact. Looks up the contact's currently
 * known `updated_at` from the selection store to send as the conflict check
 * (a projection step the pProvider itself doesn't do), then — on success —
 * merges the updated record back into the store so the overview and detail
 * view reflect it without a full reload.
 */
export function updateContact(deps: UpdateContactDeps) {
  return async function process(command: UpdateContactCommand): Promise<UpdateContactResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const selection = deps.selectionStore.get();
    const current = selection?.contacts.find((c) => c.id === command.id);

    const result = await deps.backendApi.updateContact(session.token, {
      id: command.id,
      data: command.data,
      active: command.active,
      expected_updated_at: current?.updated_at,
    });
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    if (selection) {
      deps.selectionStore.set({
        ...selection,
        contacts: selection.contacts.map((c) => (c.id === command.id ? result.value.contact : c)),
      });
    }

    return { ok: true, contact: result.value.contact, conflict: result.value.conflict };
  };
}
