import { describe, it, expect } from "vitest";
import { selectEntity } from "../select-entity.js";
import { InMemorySelectionStoreProvider } from "@/domain/pproviders/selection-store/in-memory-selection-store-provider";

describe("selectEntity RPU", () => {
  it("stores the given reference", () => {
    const selectionStore = new InMemorySelectionStoreProvider();
    selectEntity({ selectionStore })({ kind: "contact", id: "c1" });
    expect(selectionStore.getSelected()).toEqual({ kind: "contact", id: "c1" });
  });

  it("clears the selection with null", () => {
    const selectionStore = new InMemorySelectionStoreProvider();
    selectionStore.setSelected({ kind: "business_partner", id: "bp1" });
    selectEntity({ selectionStore })(null);
    expect(selectionStore.getSelected()).toBeNull();
  });
});
