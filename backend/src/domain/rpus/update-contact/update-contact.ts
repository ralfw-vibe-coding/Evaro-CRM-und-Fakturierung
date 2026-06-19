import type { Contact } from "../../model.js";
import type { ContactsProvider } from "../../pproviders/contacts/contacts-provider.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import { validateContactData, type RawContactData } from "../../contact-data.js";

export interface UpdateContactCommand {
  user_id: string;
  id: string;
  active?: boolean;
  /** The `updated_at` the client last saw, for conflict detection. */
  expected_updated_at?: string;
  data: RawContactData;
}

export type UpdateContactResult =
  | { ok: true; contact: Contact; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface UpdateContactDeps {
  contacts: ContactsProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * RPU: overwrite an existing contact's fields (explicit save, not a partial
 * patch — the client always sends the full edited record).
 *
 * Conflict handling per crm-briefing.md "Data Flow": last-write-wins, but warn
 * the caller if `expected_updated_at` no longer matches what's stored. We still
 * apply the write — the warning is informational, not a block.
 */
export function updateContact(deps: UpdateContactDeps) {
  return async function process(command: UpdateContactCommand): Promise<UpdateContactResult> {
    const user_id = trimOrUndefined(command.user_id);
    if (!user_id) {
      return { ok: false, error: "Kein angemeldeter Benutzer." };
    }

    const id = trimOrUndefined(command.id);
    if (!id) {
      return { ok: false, error: "Kontakt-ID fehlt." };
    }

    const validation = validateContactData(command.data ?? {});
    if (!validation.ok) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields: validation.fields };
    }
    const { data } = validation;

    const existing = await deps.contacts.findById(id);
    if (!existing) {
      return { ok: false, error: "Kontakt nicht gefunden." };
    }
    const conflict = Boolean(
      command.expected_updated_at && command.expected_updated_at !== existing.updated_at,
    );

    const contact = await deps.contacts.update(id, { active: command.active, data });
    if (!contact) {
      return { ok: false, error: "Kontakt nicht gefunden." };
    }

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: contact.id,
      user_id,
      type: "contact_updated",
      payload: { data },
    });

    return { ok: true, contact, conflict };
  };
}
