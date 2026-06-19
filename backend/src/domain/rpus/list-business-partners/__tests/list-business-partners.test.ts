import { describe, it, expect } from "vitest";
import { listBusinessPartners } from "../list-business-partners.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";

describe("listBusinessPartners RPU", () => {
  it("returns all business partners", async () => {
    const businessPartners = new InMemoryBusinessPartnersProvider([
      { types: ["customer"], data: { name: "AOK Rheinland", channels: [] } },
      { types: ["supplier"], data: { name: "Druckerei Meyer", channels: [] } },
    ]);
    const process = listBusinessPartners({ businessPartners });

    const result = await process();

    expect(result.business_partners).toHaveLength(2);
    expect(result.business_partners.map((b) => b.data.name)).toContain("AOK Rheinland");
  });

  it("returns an empty list when there are none", async () => {
    const process = listBusinessPartners({
      businessPartners: new InMemoryBusinessPartnersProvider(),
    });
    expect((await process()).business_partners).toEqual([]);
  });
});
