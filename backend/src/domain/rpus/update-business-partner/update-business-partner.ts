import {
  normalizeTypes,
  validateBusinessPartnerData,
  type RawBusinessPartnerData,
} from "../../business-partner-data.js";
import type { BusinessPartner } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";

export interface UpdateBusinessPartnerCommand {
  user_id: string;
  id: string;
  types?: string[];
  expected_updated_at?: string;
  data: RawBusinessPartnerData;
}

export type UpdateBusinessPartnerResult =
  | { ok: true; business_partner: BusinessPartner; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface UpdateBusinessPartnerDeps {
  businessPartners: BusinessPartnersProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function updateBusinessPartner(deps: UpdateBusinessPartnerDeps) {
  return async function process(
    command: UpdateBusinessPartnerCommand,
  ): Promise<UpdateBusinessPartnerResult> {
    const user_id = trimOrUndefined(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const id = trimOrUndefined(command.id);
    if (!id) return { ok: false, error: "Geschäftspartner-ID fehlt." };

    const validation = validateBusinessPartnerData(command.data ?? {});
    if (!validation.ok) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields: validation.fields };
    }

    const existing = await deps.businessPartners.findById(id);
    if (!existing) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    const conflict = Boolean(
      command.expected_updated_at && command.expected_updated_at !== existing.updated_at,
    );

    const business_partner = await deps.businessPartners.update(id, {
      types: normalizeTypes(command.types),
      data: validation.data,
    });
    if (!business_partner) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: business_partner.id,
      user_id,
      type: "business_partner_updated",
      payload: { types: business_partner.types, data: business_partner.data },
    });

    return { ok: true, business_partner, conflict };
  };
}
