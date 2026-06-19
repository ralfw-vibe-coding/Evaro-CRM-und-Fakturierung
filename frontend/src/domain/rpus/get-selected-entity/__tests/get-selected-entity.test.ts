import { describe, it, expect } from "vitest";
import { getSelectedEntity } from "../get-selected-entity.js";
import { InMemorySelectionStoreProvider } from "@/domain/pproviders/selection-store/in-memory-selection-store-provider";
import type { Contact, BusinessPartner } from "@/domain/model";

const CONTACT: Contact = {
  id: "c1",
  active: true,
  data: { first_name: "Petra", channels: [] },
  created_at: "",
  updated_at: "",
};
const BP: BusinessPartner = {
  id: "bp1",
  types: [],
  data: { name: "AOK Rheinland", channels: [] },
  created_at: "",
  updated_at: "",
};

function storeWith() {
  const store = new InMemorySelectionStoreProvider();
  store.set({ contacts: [CONTACT], business_partners: [BP], contact_gps: [] });
  return store;
}

describe("getSelectedEntity RPU", () => {
  it("returns null when nothing is selected", () => {
    const store = storeWith();
    expect(getSelectedEntity({ selectionStore: store })()).toBeNull();
  });

  it("resolves a selected contact reference to the full contact", () => {
    const store = storeWith();
    store.setSelected({ kind: "contact", id: "c1" });
    expect(getSelectedEntity({ selectionStore: store })()).toEqual({
      kind: "contact",
      contact: CONTACT,
      relatedBusinessPartners: [],
      availableBusinessPartners: [BP],
    });
  });

  it("resolves a selected business-partner reference to the full record", () => {
    const store = storeWith();
    store.setSelected({ kind: "business_partner", id: "bp1" });
    expect(getSelectedEntity({ selectionStore: store })()).toEqual({
      kind: "business_partner",
      businessPartner: BP,
      relatedContacts: [],
      availableContacts: [CONTACT],
    });
  });

  it("returns null when the referenced entity is no longer in the selection", () => {
    const store = storeWith();
    store.setSelected({ kind: "contact", id: "does-not-exist" });
    expect(getSelectedEntity({ selectionStore: store })()).toBeNull();
  });

  it("returns null when nothing has been loaded yet", () => {
    const store = new InMemorySelectionStoreProvider();
    store.setSelected({ kind: "contact", id: "c1" });
    expect(getSelectedEntity({ selectionStore: store })()).toBeNull();
  });
});
