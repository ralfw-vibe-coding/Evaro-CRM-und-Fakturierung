import type { ContactGp } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { ContactGpsProvider } from "../../pproviders/contact-gps/contact-gps-provider.js";

export interface LinkContactGpCommand {
  user_id: string;
  contact_id: string;
  gp_id: string;
  role?: string;
  primary?: boolean;
}

export type LinkContactGpResult =
  | { ok: true; link: ContactGp }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface LinkContactGpDeps {
  contactGps: ContactGpsProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function linkContactGp(deps: LinkContactGpDeps) {
  return async function process(command: LinkContactGpCommand): Promise<LinkContactGpResult> {
    const fields: Record<string, string> = {};
    const user_id = trimOrUndefined(command.user_id);
    const contact_id = trimOrUndefined(command.contact_id);
    const gp_id = trimOrUndefined(command.gp_id);
    const role = trimOrUndefined(command.role);

    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };
    if (!contact_id) fields.contact_id = "Kontakt fehlt.";
    if (!gp_id) fields.gp_id = "Geschäftspartner fehlt.";
    if (Object.keys(fields).length > 0) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields };
    }

    const link = await deps.contactGps.upsert({
      contact_id: contact_id!,
      gp_id: gp_id!,
      role: role ?? "",
      primary: command.primary ?? false,
    });

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: link.contact_id,
      user_id,
      type: "gp_linked",
      payload: { gp_id: link.gp_id, role: link.role, primary: link.primary },
    });

    return { ok: true, link };
  };
}
