import type { Contact, BusinessPartner, ContactGp } from "../../domain/model.js";
import type { ListActiveContactsResult } from "../../domain/rpus/list-active-contacts/list-active-contacts.js";
import type { ListBusinessPartnersResult } from "../../domain/rpus/list-business-partners/list-business-partners.js";
import type { ContactGpsProvider } from "../../domain/pproviders/contact-gps/contact-gps-provider.js";

export interface SelectResult {
  contacts: Contact[];
  business_partners: BusinessPartner[];
  contact_gps: ContactGp[];
}

export interface SelectDeps {
  listActiveContacts: () => Promise<ListActiveContactsResult>;
  listAllContacts: () => Promise<ListActiveContactsResult>;
  listBusinessPartners: (options?: { includeInactive?: boolean }) => Promise<ListBusinessPartnersResult>;
  contactGps: ContactGpsProvider;
}

/**
 * Reactor: the initial selection. Loads active entities by default and includes
 * passive import records only when requested.
 */
export function select(deps: SelectDeps) {
  return async function process(options: { includeInactive?: boolean } = {}): Promise<SelectResult> {
    const [contacts, bps, contactGps] = await Promise.all([
      options.includeInactive ? deps.listAllContacts() : deps.listActiveContacts(),
      deps.listBusinessPartners({ includeInactive: options.includeInactive }),
      deps.contactGps.listAll(),
    ]);
    return {
      contacts: contacts.contacts,
      business_partners: bps.business_partners,
      contact_gps: contactGps,
    };
  };
}
