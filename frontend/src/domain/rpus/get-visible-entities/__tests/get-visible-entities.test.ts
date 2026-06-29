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

function bp(
  overrides: Partial<BusinessPartner["data"]> & { name: string },
  options: { active?: boolean } = {},
): BusinessPartner {
  return {
    id: `bp-${overrides.name}`,
    active: options.active ?? true,
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

  it("combines selected tags within one category with OR", () => {
    const store = storeWith(
      [
        contact({ last_name: "Wolf", role: ["Coach"] }),
        contact({ last_name: "Berger", role: ["Trainer"] }),
        contact({ last_name: "Meyer", role: ["Berater"] }),
      ],
      [],
    );
    store.setSelectedTags([
      { category: "contact.role", tag: "Coach" },
      { category: "contact.role", tag: "Trainer" },
    ]);

    const result = getVisibleEntities({ selectionStore: store })();

    expect(result.entities.map((entity) => (entity.kind === "contact" ? entity.contact.data.last_name : ""))).toEqual([
      "Berger",
      "Wolf",
    ]);
  });

  it("combines selected tags across categories with AND", () => {
    const store = storeWith(
      [
        contact({ last_name: "Wolf", role: ["Coach"], work_area: ["KI"] }),
        contact({ last_name: "Berger", role: ["Coach"], work_area: ["HR"] }),
        contact({ last_name: "Meyer", role: ["Berater"], work_area: ["KI"] }),
      ],
      [],
    );
    store.setSelectedTags([
      { category: "contact.role", tag: "Coach" },
      { category: "contact.work_area", tag: "KI" },
    ]);

    const result = getVisibleEntities({ selectionStore: store })();

    expect(result.entities.map((entity) => (entity.kind === "contact" ? entity.contact.data.last_name : ""))).toEqual([
      "Wolf",
    ]);
  });

  it("filters by scope", () => {
    const store = storeWith([contact({ last_name: "Wolf" })], [bp({ name: "AOK Rheinland" })]);
    store.setScope("contacts");
    const result = getVisibleEntities({ selectionStore: store })();
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].kind).toBe("contact");
  });

  it("hides inactive business partners unless inactive records are included", () => {
    const store = storeWith(
      [],
      [bp({ name: "AOK Rheinland" }), bp({ name: "Newsletter Import" }, { active: false })],
    );

    const activeOnly = getVisibleEntities({ selectionStore: store })();
    expect(
      activeOnly.entities.map((entity) =>
        entity.kind === "business_partner" ? entity.businessPartner.data.name : "",
      ),
    ).toEqual(["AOK Rheinland"]);

    store.setIncludeInactive(true);
    const withInactive = getVisibleEntities({ selectionStore: store })();
    expect(
      withInactive.entities.map((entity) =>
        entity.kind === "business_partner" ? entity.businessPartner.data.name : "",
      ),
    ).toEqual(["AOK Rheinland", "Newsletter Import"]);
  });

  it("returns an empty result before anything has been loaded", () => {
    const result = getVisibleEntities({ selectionStore: new InMemorySelectionStoreProvider() })();
    expect(result.entities).toEqual([]);
    expect(result.counts).toEqual({ contacts: 0, businessPartners: 0 });
  });

  it("adds connection counts for contacts and business partners", () => {
    const contacts = [contact({ last_name: "Wolf" }), contact({ last_name: "Berger" })];
    const businessPartners = [bp({ name: "AOK Rheinland" }), bp({ name: "Zeitgewinn Hamburg" })];
    const store = storeWith(contacts, businessPartners);
    store.set({
      contacts,
      business_partners: businessPartners,
      contact_gps: [
        { contact_id: contacts[0].id, gp_id: businessPartners[0].id, role: "Kunde", primary: true, created_at: "" },
        { contact_id: contacts[0].id, gp_id: businessPartners[1].id, role: "Partner", primary: false, created_at: "" },
        { contact_id: contacts[1].id, gp_id: businessPartners[0].id, role: "Kontakt", primary: false, created_at: "" },
      ],
    });

    const result = getVisibleEntities({ selectionStore: store })();

    const wolf = result.entities.find((entity) => entity.kind === "contact" && entity.contact.id === contacts[0].id);
    const aok = result.entities.find(
      (entity) => entity.kind === "business_partner" && entity.businessPartner.id === businessPartners[0].id,
    );
    expect(wolf?.connectionCount).toBe(2);
    expect(aok?.connectionCount).toBe(2);
  });

  it("projects the first linked business partner name as company fallback for contacts without company", () => {
    const contacts = [contact({ last_name: "Wolf" })];
    const businessPartners = [bp({ name: "AOK Rheinland" }), bp({ name: "Zeitgewinn Hamburg" })];
    const store = storeWith(contacts, businessPartners);
    store.set({
      contacts,
      business_partners: businessPartners,
      contact_gps: [
        { contact_id: contacts[0].id, gp_id: businessPartners[0].id, role: "", primary: false, created_at: "" },
        { contact_id: contacts[0].id, gp_id: businessPartners[1].id, role: "", primary: false, created_at: "" },
      ],
    });

    const result = getVisibleEntities({ selectionStore: store })();
    const wolf = result.entities.find((entity) => entity.kind === "contact" && entity.contact.id === contacts[0].id);

    expect(wolf?.kind).toBe("contact");
    if (wolf?.kind === "contact") expect(wolf.companyFallback).toBe("AOK Rheinland");
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
