import { describe, expect, it } from "vitest";
import type { BusinessPartner, Invoice } from "@/domain/model";
import { InMemoryInvoiceStoreProvider } from "../in-memory-invoice-store-provider";

function bp(id: string, name: string): BusinessPartner {
  return {
    id,
    active: true,
    types: [],
    data: {
      name,
      vat_id: "DE123",
      address: { street: "Neu 1", zip: "20095", city: "Hamburg", country: "Deutschland" },
      invoice_language: "en",
      channels: [{ type: "email", address: "rechnung@example.test" }],
    },
    created_at: "",
    updated_at: "",
  };
}

function invoice(status: Invoice["status"]): Invoice {
  return {
    id: status,
    business_partner_id: "bp-1",
    status,
    invoice_number: status === "draft" ? null : "0000000001",
    invoice_date: status === "draft" ? null : "2026-07-01",
    vat_rate: 0,
    gp_snapshot: { name: "Alter Name" },
    data: { lines: [] },
    created_at: "",
    updated_at: "",
  };
}

describe("InMemoryInvoiceStoreProvider", () => {
  it("updates loaded draft invoice snapshots when a business partner changes", () => {
    const store = new InMemoryInvoiceStoreProvider();
    store.set({
      invoices: [invoice("draft"), invoice("billed")],
      payment_terms: [],
      business_partners: [bp("bp-1", "Alter Name")],
    });

    store.syncDraftSnapshotsForBusinessPartner(bp("bp-1", "Neuer Name"));

    const data = store.get();
    expect(data?.invoices.find((item) => item.status === "draft")?.gp_snapshot).toMatchObject({
      name: "Neuer Name",
      vat_id: "DE123",
      email: "rechnung@example.test",
      invoice_language: "en",
    });
    expect(data?.invoices.find((item) => item.status === "billed")?.gp_snapshot.name).toBe("Alter Name");
    expect(data?.business_partners[0].data.name).toBe("Neuer Name");
  });
});
