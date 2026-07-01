import { beforeEach, describe, expect, it } from "vitest";
import { updateInvoiceDraft } from "../update-invoice-draft.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

function setup() {
  const invoices = new InMemoryInvoicesProvider();
  const businessPartners = new InMemoryBusinessPartnersProvider();
  const process = updateInvoiceDraft({ invoices, businessPartners });
  return { invoices, businessPartners, process };
}

describe("updateInvoiceDraft RPU", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  it("updates draft data and reports no conflict when updated_at matches", async () => {
    const invoice = await env.invoices.insertDraft({
      business_partner_id: "11111111-1111-1111-1111-111111111111",
      gp_snapshot: { name: "Acme GmbH" },
      vat_rate: 0,
    });

    const result = await env.process({
      id: invoice.id,
      expected_updated_at: invoice.updated_at,
      vat_rate: 0,
      data: {
        reference: "Projekt A",
        payment_terms: "Zahlbar bis {rgdatum + 10}",
        lines: [{ id: "l1", product_form: "Beratung", quantity: 2, unit_price: 100 }],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.conflict).toBe(false);
    expect(result.invoice.data.reference).toBe("Projekt A");
    expect(result.invoice.data.lines[0]).toMatchObject({
      product_form: "Beratung",
      quantity: 2,
      unit_price: 100,
    });
  });

  it("flags a conflict when expected_updated_at differs, but still writes", async () => {
    const invoice = await env.invoices.insertDraft({
      business_partner_id: "11111111-1111-1111-1111-111111111111",
      gp_snapshot: { name: "Acme GmbH" },
      vat_rate: 0,
    });

    const result = await env.process({
      id: invoice.id,
      expected_updated_at: "2000-01-01T00:00:00.000Z",
      vat_rate: 0,
      data: { comment: "Neu", lines: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.conflict).toBe(true);
    expect(result.invoice.data.comment).toBe("Neu");
  });

  it("refreshes the business-partner snapshot while saving a draft", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Aktuelle GP GmbH",
        vat_id: "DE777",
        address: { street: "Jetzt 7", zip: "20095", city: "Hamburg", country: "Deutschland" },
        channels: [{ type: "email", address: "aktuell@gp.test" }],
      },
    });
    const invoice = await env.invoices.insertDraft({
      business_partner_id: bp.id,
      gp_snapshot: { name: "Alter Snapshot" },
      vat_rate: 0,
    });

    const result = await env.process({
      id: invoice.id,
      vat_rate: 0,
      data: { lines: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.gp_snapshot.name).toBe("Aktuelle GP GmbH");
    expect(result.invoice.gp_snapshot.email).toBe("aktuell@gp.test");
  });

  it("rejects invalid amounts", async () => {
    const invoice = await env.invoices.insertDraft({
      business_partner_id: "11111111-1111-1111-1111-111111111111",
      gp_snapshot: { name: "Acme GmbH" },
      vat_rate: 0,
    });

    const result = await env.process({
      id: invoice.id,
      vat_rate: 101,
      data: { lines: [{ id: "l1", quantity: 0, unit_price: 100 }] },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.vat_rate).toBeTruthy();
    expect(result.fields?.["lines.0.quantity"]).toBeTruthy();
  });
});
