import type { Contact } from "../../model.js";
import type { ContactsProvider } from "../../pproviders/contacts/contacts-provider.js";

export interface ListActiveContactsResult {
  contacts: Contact[];
}

export interface ListActiveContactsDeps {
  contacts: ContactsProvider;
}

/**
 * RPU (Query): return all active contacts for the initial selection.
 * Passive contacts (active = false) are never included here (see
 * crm-briefing.md "Active vs. Passive Contacts").
 */
export function listActiveContacts(deps: ListActiveContactsDeps) {
  return async function process(): Promise<ListActiveContactsResult> {
    return { contacts: await deps.contacts.listActive() };
  };
}
