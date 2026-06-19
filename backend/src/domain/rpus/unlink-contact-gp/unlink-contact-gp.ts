import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { ContactGpsProvider } from "../../pproviders/contact-gps/contact-gps-provider.js";

export interface UnlinkContactGpCommand {
  user_id: string;
  contact_id: string;
  gp_id: string;
}

export type UnlinkContactGpResult = { ok: true } | { ok: false; error: string };

export interface UnlinkContactGpDeps {
  contactGps: ContactGpsProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function unlinkContactGp(deps: UnlinkContactGpDeps) {
  return async function process(command: UnlinkContactGpCommand): Promise<UnlinkContactGpResult> {
    const user_id = trimOrUndefined(command.user_id);
    const contact_id = trimOrUndefined(command.contact_id);
    const gp_id = trimOrUndefined(command.gp_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };
    if (!contact_id || !gp_id) return { ok: false, error: "Verknüpfung unvollständig." };

    const deleted = await deps.contactGps.delete(contact_id, gp_id);
    if (!deleted) return { ok: false, error: "Verknüpfung nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: contact_id,
      user_id,
      type: "gp_unlinked",
      payload: { gp_id },
    });

    return { ok: true };
  };
}
