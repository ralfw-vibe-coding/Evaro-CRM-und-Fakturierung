import { describe, it, expect } from "vitest";
import { getVisibleEntities } from "../get-visible-entities.js";
import { InMemorySelectionStoreProvider } from "@/domain/pproviders/selection-store/in-memory-selection-store-provider";
import type { Contact, BusinessPartner } from "@/domain/model";

function contact(overrides: Partial<Contact["data"]> & { last_name: string }): Contact {
  return {
    id: `c-${overrides.last_name}`,
    active: true,
    data: { channels: [], ...overrides },
    created_at: "",
    updated_at: "",
  };
}

function bp(overrides: Partial<BusinessPartner["data"]> & { name: string }): BusinessPartner {
  return {
    id: `bp-${overrides.name}`,
    types: [],
    data: { channels: [], ...overrides },
    created_at: "",
    updated_at: "",
  };
}

function storeWith(contacts: Contact[], businessPartners: BusinessPartner[]) {
  const store = new InMemorySelectionStoreProvider();
  store.set({ contacts, business_partners: businessPartners, contact_gps: [] });
  return store;
}

describe("getVisibleEntities RPU — without search", () => {
  it("mixes contacts and business partners, sorted together by name", () => {
    const store = storeWith(
      [contact({ last_name: "Wolf" }), contact({ last_name: "Berger" })],
      [bp({ name: "AOK Rheinland" }), bp({ name: "Zeitgewinn Hamburg" })],
    );
    const result = getVisibleEntities({ selectionStore: store })();

    expect(
      result.entities.map((e) => (e.kind === "contact" ? e.contact.data.last_name : e.businessPartner.data.name)),
    ).toEqual(["AOK Rheinland", "Berger", "Wolf", "Zeitgewinn Hamburg"]);
    expect(result.counts).toEqual({ contacts: 2, businessPartners: 2 });
  });

  it("filters by scope", () => {
    const store = storeWith([contact({ last_name: "Wolf" })], [bp({ name: "AOK Rheinland" })]);
    store.setScope("contacts");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].kind).toBe("contact");
  });

  it("returns an empty result before anything has been loaded", () => {
    const result = getVisibleEntities({ selectionStore: new InMemorySelectionStoreProvider() })();
    expect(result.entities).toEqual([]);
    expect(result.counts).toEqual({ contacts: 0, businessPartners: 0 });
  });
});

describe("getVisibleEntities RPU — full-text search", () => {
  it("matches tier 1 (name/company) and sorts those highest", () => {
    const store = storeWith(
      [contact({ first_name: "Petra", last_name: "Aalberg" })],
      [bp({ name: "Aalen Consulting" })],
    );
    store.setSearchTerm("aal");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities).toHaveLength(2);
    expect(result.entities.every((e) => !e.matchHint)).toBe(true);
  });

  it("excludes entities that don't match anywhere", () => {
    const store = storeWith(
      [contact({ last_name: "Wolf" }), contact({ last_name: "Berger" })],
      [],
    );
    store.setSearchTerm("wolf");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities).toHaveLength(1);
    expect(result.counts).toEqual({ contacts: 1, businessPartners: 0 });
  });

  it("ranks a tier-1 match (name) above a tier-2 match (channel/notes)", () => {
    const store = storeWith(
      [
        contact({ last_name: "Findus", first_name: "Pelle" }),
        contact({ last_name: "Müller", notes: "kennt sich mit Findus-Software aus" }),
      ],
      [],
    );
    store.setSearchTerm("findus");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities.map((e) => (e.kind === "contact" ? e.contact.data.last_name : ""))).toEqual([
      "Findus",
      "Müller",
    ]);
  });

  it("ranks a tier-2 match (channel) above a tier-3 match (address)", () => {
    const store = storeWith(
      [],
      [
        bp({ name: "A", address: { city: "Hamburg", country: "DE" } }),
        bp({ name: "B", channels: [{ type: "email", address: "kontakt@hamburg-gruppe.de" }] }),
      ],
    );
    store.setSearchTerm("hamburg");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities.map((e) => (e.kind === "business_partner" ? e.businessPartner.data.name : ""))).toEqual([
      "B",
      "A",
    ]);
  });

  it("sorts alphabetically within the same tier", () => {
    const store = storeWith(
      [],
      [bp({ name: "Zett Logistik", notes: "Stammkunde" }), bp({ name: "Anton Bau", notes: "Stammkunde" })],
    );
    store.setSearchTerm("stammkunde");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities.map((e) => (e as { businessPartner: BusinessPartner }).businessPartner.data.name)).toEqual(
      ["Anton Bau", "Zett Logistik"],
    );
  });

  it("adds a match hint for a hit in a field not shown on the card (notes)", () => {
    const store = storeWith(
      [contact({ last_name: "Wolf", notes: "Interessiert an Coaching" })],
      [],
    );
    store.setSearchTerm("coaching");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities[0].matchHint).toEqual({ label: "Notizen", snippet: "Interessiert an Coaching" });
  });

  it("adds no match hint when the hit is in a field already shown on the card", () => {
    const store = storeWith(
      [contact({ last_name: "Wolf", channels: [{ type: "email", address: "wolf@example.com" }] })],
      [],
    );
    store.setSearchTerm("wolf@example");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities[0].matchHint).toBeUndefined();
  });

  it("adds a match hint for a hit in an address field (GP)", () => {
    const store = storeWith([], [bp({ name: "Beta GmbH", address: { street: "Hauptstraße 5" } })]);
    store.setSearchTerm("hauptstraße");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities[0].matchHint).toEqual({ label: "Straße", snippet: "Hauptstraße 5" });
  });

  it("is case-insensitive", () => {
    const store = storeWith([contact({ last_name: "WOLF" })], []);
    store.setSearchTerm("wolf");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities).toHaveLength(1);
  });
});
