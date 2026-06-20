import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { ContactGpsProvider } from "../../pproviders/contact-gps/contact-gps-provider.js";
import type { ContactsProvider } from "../../pproviders/contacts/contacts-provider.js";

export interface DeleteContactCommand {
  user_id: string;
  id: string;
}

export type DeleteContactResult = { ok: true } | { ok: false; error: string };

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function deleteContact(deps: {
  contacts: ContactsProvider;
  contactGps: ContactGpsProvider;
  activityLog: ActivityLogProvider;
}) {
  return async function process(command: DeleteContactCommand): Promise<DeleteContactResult> {
    const user_id = trimOrUndefined(command.user_id);
    const id = trimOrUndefined(command.id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };
    if (!id) return { ok: false, error: "Kontakt-ID fehlt." };

    const existing = await deps.contacts.findById(id);
    if (!existing) return { ok: false, error: "Kontakt nicht gefunden." };

    const removedLinks = await deps.contactGps.deleteForContact(id);
    const deleted = await deps.contacts.delete(id);
    if (!deleted) return { ok: false, error: "Kontakt nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: id,
      user_id,
      type: "contact_deleted",
      payload: { removed_links: removedLinks, data: existing.data },
    });

    return { ok: true };
  };
}
