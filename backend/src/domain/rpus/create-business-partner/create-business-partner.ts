import {
  normalizeTypes,
  validateBusinessPartnerData,
  type RawBusinessPartnerData,
} from "../../business-partner-data.js";
import type { BusinessPartner } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";

export interface CreateBusinessPartnerCommand {
  user_id: string;
  types?: string[];
  data: RawBusinessPartnerData;
}

export type CreateBusinessPartnerResult =
  | { ok: true; business_partner: BusinessPartner }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface CreateBusinessPartnerDeps {
  businessPartners: BusinessPartnersProvider;
  activityLog: ActivityLogProvider;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function createBusinessPartner(deps: CreateBusinessPartnerDeps) {
  return async function process(
    command: CreateBusinessPartnerCommand,
  ): Promise<CreateBusinessPartnerResult> {
    const user_id = trimOrUndefined(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const validation = validateBusinessPartnerData(command.data ?? {});
    if (!validation.ok) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields: validation.fields };
    }

    const business_partner = await deps.businessPartners.insert({
      types: normalizeTypes(command.types),
      data: validation.data,
    });

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: business_partner.id,
      user_id,
      type: "business_partner_created",
      payload: { types: business_partner.types, data: business_partner.data },
    });

    return { ok: true, business_partner };
  };
}
