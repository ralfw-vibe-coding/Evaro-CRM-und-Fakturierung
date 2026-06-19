import type { BusinessPartner } from "../../model.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";

export interface ListBusinessPartnersResult {
  business_partners: BusinessPartner[];
}

export interface ListBusinessPartnersDeps {
  businessPartners: BusinessPartnersProvider;
}

/** RPU (Query): return all business partners. */
export function listBusinessPartners(deps: ListBusinessPartnersDeps) {
  return async function process(): Promise<ListBusinessPartnersResult> {
    return { business_partners: await deps.businessPartners.listAll() };
  };
}
