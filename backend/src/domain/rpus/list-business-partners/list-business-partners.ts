import type { BusinessPartner } from "../../model.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";

export interface ListBusinessPartnersResult {
  business_partners: BusinessPartner[];
}

export interface ListBusinessPartnersDeps {
  businessPartners: BusinessPartnersProvider;
}

/** RPU (Query): return business partners for the current active/passive selection. */
export function listBusinessPartners(deps: ListBusinessPartnersDeps) {
  return async function process(options: { includeInactive?: boolean } = {}): Promise<ListBusinessPartnersResult> {
    return {
      business_partners: options.includeInactive
        ? await deps.businessPartners.listAll()
        : await deps.businessPartners.listActive(),
    };
  };
}
