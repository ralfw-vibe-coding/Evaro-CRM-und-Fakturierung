import type { Contact, ContactData } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface CreateContactCommand {
  data: ContactData;
  active?: boolean;
}

export type CreateContactResult =
  | { ok: true; contact: Contact }
  | { ok: false; error: string; fields?: Record<string, string> };

export function createContact(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(command: CreateContactCommand): Promise<CreateContactResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.createContact(session.token, command);
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    const selection = deps.selectionStore.get();
    if (selection) {
      deps.selectionStore.set({
        ...selection,
        contacts: [...selection.contacts, result.value.contact],
      });
    }

    return { ok: true, contact: result.value.contact };
  };
}
