import { describe, expect, it } from "vitest";
import { listInvoicingData } from "../list-invoicing-data.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

describe("listInvoicingData RPU", () => {
  it("shows current business-partner data for draft invoices", async () => {
    const invoices = new InMemoryInvoicesProvider();
    const businessPartners = new InMemoryBusinessPartnersProvider();
    const process = listInvoicingData({ invoices, businessPartners });
    const bp = await businessPartners.insert({
      types: [],
      data: {
        name: "Aktueller Name GmbH",
        address: { street: "Neu 1", zip: "10115", city: "Berlin", country: "Deutschland" },
        channels: [],
      },
    });
    await invoices.insertDraft({
      business_partner_id: bp.id,
      gp_snapshot: { name: "Alter Snapshot" },
      vat_rate: 0,
    });

    const result = await process();

    expect(result.invoices[0].gp_snapshot.name).toBe("Aktueller Name GmbH");
    expect(result.invoices[0].gp_snapshot.address?.street).toBe("Neu 1");
  });

  it("keeps billed invoice snapshots frozen", async () => {
    const invoices = new InMemoryInvoicesProvider();
    const businessPartners = new InMemoryBusinessPartnersProvider();
    const process = listInvoicingData({ invoices, businessPartners });
    const bp = await businessPartners.insert({
      types: [],
      data: { name: "Aktueller Name GmbH", channels: [] },
    });
    const invoice = await invoices.insertDraft({
      business_partner_id: bp.id,
      gp_snapshot: { name: "Eingefrorener Snapshot" },
      vat_rate: 0,
    });
    await invoices.billDraft(invoice.id, {
      first_invoice_number: 1,
      invoice_date: "2026-07-01",
    });

    const result = await process();

    expect(result.invoices[0].status).toBe("billed");
    expect(result.invoices[0].gp_snapshot.name).toBe("Eingefrorener Snapshot");
  });
});
