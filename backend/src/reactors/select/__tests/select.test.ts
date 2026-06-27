import { describe, it, expect } from "vitest";
import { select } from "../select.js";
import { listActiveContacts } from "../../../domain/rpus/list-active-contacts/list-active-contacts.js";
import { listBusinessPartners } from "../../../domain/rpus/list-business-partners/list-business-partners.js";
import { InMemoryContactsProvider } from "../../../domain/pproviders/contacts/in-memory-contacts-provider.js";
import { InMemoryBusinessPartnersProvider } from "../../../domain/pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryContactGpsProvider } from "../../../domain/pproviders/contact-gps/in-memory-contact-gps-provider.js";

describe("select reactor", () => {
  it("returns active contacts and all business partners together", async () => {
    const contacts = new InMemoryContactsProvider([
      { active: true, data: { first_name: "Petra", channels: [] } },
      { active: false, data: { first_name: "Passiv", channels: [] } },
    ]);
    const businessPartners = new InMemoryBusinessPartnersProvider([
      { types: ["customer"], data: { name: "AOK Rheinland", channels: [] } },
    ]);

    const process = select({
      listActiveContacts: listActiveContacts({ contacts }),
      listAllContacts: async () => ({ contacts: await contacts.listAll() }),
      listBusinessPartners: listBusinessPartners({ businessPartners }),
      contactGps: new InMemoryContactGpsProvider(),
    });

    const result = await process();

    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].data.first_name).toBe("Petra");
    expect(result.business_partners).toHaveLength(1);
    expect(result.business_partners[0].data.name).toBe("AOK Rheinland");
    expect(result.contact_gps).toEqual([]);

    const withInactive = await process({ includeInactive: true });
    expect(withInactive.contacts).toHaveLength(2);
  });
});
