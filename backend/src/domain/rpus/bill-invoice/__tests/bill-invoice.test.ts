import { beforeEach, describe, expect, it } from "vitest";
import { billInvoice } from "../bill-invoice.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";
const BP = "22222222-2222-2222-2222-222222222222";

function setup(firstInvoiceNumber = 1) {
  const invoices = new InMemoryInvoicesProvider();
  const businessPartners = new InMemoryBusinessPartnersProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const process = billInvoice({ invoices, businessPartners, activityLog, firstInvoiceNumber });
  return { invoices, businessPartners, activityLog, process };
}

async function draft(invoices: InMemoryInvoicesProvider) {
  return invoices.insertDraft({
    business_partner_id: BP,
    gp_snapshot: { name: "Acme GmbH" },
    vat_rate: 0,
  });
}

describe("billInvoice RPU", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  it("assigns FIRST_INVOICE_NUMBER when it is greater than all existing numbers", async () => {
    env = setup(1234);
    const invoice = await draft(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("billed");
    expect(result.invoice.invoice_number).toBe("0000001234");
    expect(result.invoice.invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("increments the largest existing invoice number when it is greater than FIRST_INVOICE_NUMBER", async () => {
    env = setup(1000);
    const existing = await draft(env.invoices);
    await env.invoices.billDraft(existing.id, {
      first_invoice_number: 2000,
      invoice_date: "2026-01-01",
    });
    const invoice = await draft(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.invoice_number).toBe("0000002001");
  });

  it("writes an invoice_billed activity entry", async () => {
    const invoice = await draft(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const log = await env.activityLog.listForEntity("business_partner", BP);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("invoice_billed");
    expect(log[0].payload).toEqual({
      invoice_id: result.invoice.id,
      invoice_number: result.invoice.invoice_number,
    });
  });

  it("freezes the current business-partner data when billing a draft", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Acme Neu GmbH",
        vat_id: "DE999",
        address: { street: "Neu 9", zip: "20359", city: "Hamburg", country: "Deutschland" },
        invoice_language: "en",
        channels: [{ type: "email", address: "neu@acme.test" }],
      },
    });
    const invoice = await env.invoices.insertDraft({
      business_partner_id: bp.id,
      gp_snapshot: { name: "Alter Name" },
      vat_rate: 0,
    });

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("billed");
    expect(result.invoice.gp_snapshot).toEqual({
      name: "Acme Neu GmbH",
      vat_id: "DE999",
      address: { street: "Neu 9", zip: "20359", city: "Hamburg", country: "Deutschland" },
      email: "neu@acme.test",
      invoice_language: "en",
    });
  });

  it("rejects invoices that are no longer drafts", async () => {
    const invoice = await draft(env.invoices);
    await env.process({ user_id: USER, id: invoice.id });

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result).toEqual({ ok: false, error: "Nur Entwürfe können abgerechnet werden." });
  });
});
