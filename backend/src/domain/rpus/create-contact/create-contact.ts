import type { Contact } from "../../model.js";
import type { ContactsProvider } from "../../pproviders/contacts/contacts-provider.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import { validateContactData, type RawContactData } from "../../contact-data.js";

/** Raw, untrusted input as it arrives from a client. */
export interface CreateContactCommand {
  user_id: string;
  active?: boolean;
  data: RawContactData;
}

export type CreateContactResult =
  | { ok: true; contact: Contact }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface CreateContactDeps {
  contacts: ContactsProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * RPU: create a new contact.
 *
 * Write flow: the briefing describes log-first writes. For a *create* there is
 * no entity id yet, and RPUs may not generate ids (randomness is a shell
 * concern). So we let the contacts pProvider mint the id on insert and then
 * append the `contact_created` log entry with that id. Atomicity across the two
 * writes is acceptable to skip for now given the tiny user base; revisit with a
 * transactional unit-of-work if needed.
 */
export function createContact(deps: CreateContactDeps) {
  return async function process(command: CreateContactCommand): Promise<CreateContactResult> {
    const user_id = trimOrUndefined(command.user_id);
    if (!user_id) {
      return { ok: false, error: "Kein angemeldeter Benutzer." };
    }

    const validation = validateContactData(command.data ?? {});
    if (!validation.ok) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields: validation.fields };
    }
    const { data } = validation;

    const contact = await deps.contacts.insert({
      active: command.active ?? true,
      data,
    });

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: contact.id,
      user_id,
      type: "contact_created",
      payload: { data },
    });

    return { ok: true, contact };
  };
}
