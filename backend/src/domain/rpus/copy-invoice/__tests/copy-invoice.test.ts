import { beforeEach, describe, expect, it } from "vitest";
import { copyInvoice } from "../copy-invoice.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";
import type { Invoice, InvoiceData } from "../../../model.js";

const USER = "11111111-1111-1111-1111-111111111111";

function setup() {
  const businessPartners = new InMemoryBusinessPartnersProvider();
  const invoices = new InMemoryInvoicesProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const process = copyInvoice({ businessPartners, invoices, activityLog });
  return { businessPartners, invoices, activityLog, process };
}

const SOURCE_DATA: InvoiceData = {
  lines: [
    {
      id: "line-1",
      product_form: "Workshop",
      product_topic: "Clean Code",
      text: "zwei Tage vor Ort",
      quantity: 2,
      unit: "Tage",
      unit_price: 1800,
      service_date: "2026-09-14",
    },
  ],
  reference: "PO-4711",
  comment: "Zahlbar ohne Abzug",
  reverse_charge: false,
  payment_due_days: 21,
};

describe("copyInvoice RPU", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  async function givenBilledInvoice(): Promise<{ bpId: string; invoice: Invoice }> {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Acme GmbH",
        address: { street: "Markt 1", zip: "20095", city: "Hamburg", country: "DE" },
        channels: [{ type: "email", address: "rechnung@acme.test" }],
      },
    });
    const draft = await env.invoices.insertDraft({
      business_partner_id: bp.id,
      gp_snapshot: { name: "Acme GmbH", invoice_language: "de" },
      vat_rate: 19,
      data: SOURCE_DATA,
    });
    const billed = await env.invoices.billDraft(draft.id, {
      first_invoice_number: 753,
      invoice_date: "2026-09-30",
    });
    return { bpId: bp.id, invoice: billed! };
  }

  it("copies the data onto a fresh draft for the same customer", async () => {
    const { bpId, invoice } = await givenBilledInvoice();

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.id).not.toBe(invoice.id);
    expect(result.invoice.business_partner_id).toBe(bpId);
    expect(result.invoice.status).toBe("draft");
    expect(result.invoice.invoice_number).toBeNull();
    expect(result.invoice.invoice_date).toBeNull();
    expect(result.invoice.vat_rate).toBe(19);
    expect(result.invoice.data).toEqual({
      ...SOURCE_DATA,
      lines: [
        {
          ...SOURCE_DATA.lines[0],
          id: result.invoice.data.lines[0].id,
          service_date: undefined,
        },
      ],
    });
  });

  it("leaves the service date empty so it cannot be billed for the old period", async () => {
    const { invoice } = await givenBilledInvoice();

    const result = await env.process({ user_id: USER, id: invoice.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invoice.data.lines[0].service_date).toBeUndefined();

    const source = await env.invoices.findById(invoice.id);
    expect(source?.data.lines[0].service_date).toBe("2026-09-14");
  });

  it("gives the copied positions their own ids and leaves the original alone", async () => {
    const { invoice } = await givenBilledInvoice();

    const result = await env.process({ user_id: USER, id: invoice.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invoice.data.lines[0].id).not.toBe("line-1");

    const source = await env.invoices.findById(invoice.id);
    expect(source?.status).toBe("billed");
    expect(source?.data.lines[0].id).toBe("line-1");
  });

  it("writes an activity entry naming the original invoice", async () => {
    const { bpId, invoice } = await givenBilledInvoice();

    const result = await env.process({ user_id: USER, id: invoice.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const log = await env.activityLog.listForEntity("business_partner", bpId);
    const copied = log.filter((entry) => entry.type === "invoice_copied");
    expect(copied).toHaveLength(1);
    expect(copied[0].payload).toEqual({
      invoice_id: result.invoice.id,
      source_invoice_id: invoice.id,
      source_invoice_number: invoice.invoice_number,
    });
  });

  it("reports an unknown invoice instead of creating an empty draft", async () => {
    const result = await env.process({ user_id: USER, id: "22222222-2222-2222-2222-222222222222" });

    expect(result).toEqual({ ok: false, error: "Rechnung nicht gefunden." });
    expect(await env.invoices.listAll()).toHaveLength(0);
  });
});
