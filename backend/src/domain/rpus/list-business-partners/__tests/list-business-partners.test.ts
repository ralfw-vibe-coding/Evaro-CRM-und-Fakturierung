import { describe, it, expect } from "vitest";
import { listBusinessPartners } from "../list-business-partners.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";

describe("listBusinessPartners RPU", () => {
  it("returns active business partners by default", async () => {
    const businessPartners = new InMemoryBusinessPartnersProvider([
      { types: ["customer"], data: { name: "AOK Rheinland", channels: [] } },
      { active: false, types: ["supplier"], data: { name: "Druckerei Meyer", channels: [] } },
    ]);
    const process = listBusinessPartners({ businessPartners });

    const result = await process();

    expect(result.business_partners.map((b) => b.data.name)).toEqual(["AOK Rheinland"]);
  });

  it("returns inactive business partners when requested", async () => {
    const businessPartners = new InMemoryBusinessPartnersProvider([
      { types: ["customer"], data: { name: "AOK Rheinland", channels: [] } },
      { active: false, types: ["supplier"], data: { name: "Druckerei Meyer", channels: [] } },
    ]);
    const process = listBusinessPartners({ businessPartners });

    const result = await process({ includeInactive: true });

    expect(result.business_partners.map((b) => b.data.name).sort()).toEqual([
      "AOK Rheinland",
      "Druckerei Meyer",
    ]);
  });

  it("returns an empty list when there are none", async () => {
    const process = listBusinessPartners({
      businessPartners: new InMemoryBusinessPartnersProvider(),
    });
    expect((await process()).business_partners).toEqual([]);
  });
});
