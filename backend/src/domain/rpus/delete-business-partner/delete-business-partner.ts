import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";
import type { ContactGpsProvider } from "../../pproviders/contact-gps/contact-gps-provider.js";

export interface DeleteBusinessPartnerCommand {
  user_id: string;
  id: string;
}

export type DeleteBusinessPartnerResult = { ok: true } | { ok: false; error: string };

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function deleteBusinessPartner(deps: {
  businessPartners: BusinessPartnersProvider;
  contactGps: ContactGpsProvider;
  activityLog: ActivityLogProvider;
}) {
  return async function process(command: DeleteBusinessPartnerCommand): Promise<DeleteBusinessPartnerResult> {
    const user_id = trimOrUndefined(command.user_id);
    const id = trimOrUndefined(command.id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };
    if (!id) return { ok: false, error: "Geschäftspartner-ID fehlt." };

    const existing = await deps.businessPartners.findById(id);
    if (!existing) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    const removedLinks = await deps.contactGps.deleteForBusinessPartner(id);
    const deleted = await deps.businessPartners.delete(id);
    if (!deleted) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: id,
      user_id,
      type: "business_partner_deleted",
      payload: { removed_links: removedLinks, types: existing.types, data: existing.data },
    });

    return { ok: true };
  };
}
