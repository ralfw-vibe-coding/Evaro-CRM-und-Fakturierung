import type { BusinessPartnerData, Channel } from "../../model.js";

export interface BusinessPartnerLookupSource {
  url: string;
  title?: string;
  fields?: string[];
}

export interface BusinessPartnerLookupCandidate {
  company_name: string;
  confidence: number;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  vat_id?: string;
  channels: Channel[];
  contacts_note?: string;
  sources: BusinessPartnerLookupSource[];
}

export interface BusinessPartnerLookupResult {
  candidates: BusinessPartnerLookupCandidate[];
}

export interface BusinessPartnerLookupCommand {
  business_partner: BusinessPartnerData;
}

export type LookupBusinessPartnerDataResult =
  | { ok: true; lookup: BusinessPartnerLookupResult }
  | { ok: false; error: string };

export interface LookupBusinessPartnerDataDeps {
  lookup: (businessPartner: BusinessPartnerData) => Promise<BusinessPartnerLookupResult>;
}

function hasSearchBasis(data: BusinessPartnerData): boolean {
  return Boolean(
    data.name.trim() ||
      data.address?.city?.trim() ||
      data.address?.country?.trim() ||
      data.channels.some((channel) => channel.type.toLowerCase() === "website" && channel.address.trim()),
  );
}

export function lookupBusinessPartnerData(deps: LookupBusinessPartnerDataDeps) {
  return async function process(
    command: BusinessPartnerLookupCommand,
  ): Promise<LookupBusinessPartnerDataResult> {
    if (!hasSearchBasis(command.business_partner)) {
      return { ok: false, error: "Bitte gib mindestens Name, Ort, Land oder Website an." };
    }
    return { ok: true, lookup: await deps.lookup(command.business_partner) };
  };
}
