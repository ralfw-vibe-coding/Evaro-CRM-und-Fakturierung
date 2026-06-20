import { describe, expect, it } from "vitest";
import { deleteInvoiceDraft } from "../delete-invoice-draft.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";
const BP = "22222222-2222-2222-2222-222222222222";

function setup() {
  const invoices = new InMemoryInvoicesProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const process = deleteInvoiceDraft({ invoices, activityLog });
  return { invoices, activityLog, process };
}

async function draft(invoices: InMemoryInvoicesProvider) {
  return invoices.insertDraft({
    business_partner_id: BP,
    gp_snapshot: { name: "Acme GmbH" },
    vat_rate: 0,
  });
}

describe("deleteInvoiceDraft RPU", () => {
  it("deletes an unnumbered draft", async () => {
    const env = setup();
    const invoice = await draft(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result).toEqual({ ok: true });
    expect(await env.invoices.findById(invoice.id)).toBeNull();
  });

  it("writes an activity entry", async () => {
    const env = setup();
    const invoice = await draft(env.invoices);

    await env.process({ user_id: USER, id: invoice.id });

    const log = await env.activityLog.listForEntity("business_partner", BP);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("invoice_draft_deleted");
    expect(log[0].payload).toEqual({ invoice_id: invoice.id, data: invoice.data });
  });

  it("rejects a draft that already has an invoice number", async () => {
    const env = setup();
    const invoice = await draft(env.invoices);
    await env.invoices.billDraft(invoice.id, {
      first_invoice_number: 1,
      invoice_date: "2026-06-20",
    });
    await env.invoices.updateStatus(invoice.id, "draft");

    const result = await env.process({ user_id: USER, id: invoice.id });

    expect(result).toEqual({ ok: false, error: "Diese Rechnung kann nicht mehr gelöscht werden." });
    expect(await env.invoices.findById(invoice.id)).not.toBeNull();
  });
});
