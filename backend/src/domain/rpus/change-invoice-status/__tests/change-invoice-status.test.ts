import { beforeEach, describe, expect, it } from "vitest";
import { changeInvoiceStatus } from "../change-invoice-status.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";
const BP = "22222222-2222-2222-2222-222222222222";

function setup() {
  const invoices = new InMemoryInvoicesProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const process = changeInvoiceStatus({ invoices, activityLog });
  return { invoices, activityLog, process };
}

async function billedInvoice(invoices: InMemoryInvoicesProvider) {
  const draft = await invoices.insertDraft({
    business_partner_id: BP,
    gp_snapshot: { name: "Acme GmbH" },
    vat_rate: 0,
  });
  const billed = await invoices.billDraft(draft.id, {
    first_invoice_number: 7,
    invoice_date: "2026-06-20",
  });
  if (!billed) throw new Error("Seed failed");
  return billed;
}

describe("changeInvoiceStatus RPU", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  it("marks a billed invoice as paid", async () => {
    const invoice = await billedInvoice(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id, status: "paid" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("paid");
    expect(result.invoice.invoice_number).toBe("0000000007");
    expect(result.invoice.invoice_date).toBe("2026-06-20");
  });

  it("returns a billed invoice to draft without clearing number or date", async () => {
    const invoice = await billedInvoice(env.invoices);

    const result = await env.process({ user_id: USER, id: invoice.id, status: "draft" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("draft");
    expect(result.invoice.invoice_number).toBe("0000000007");
    expect(result.invoice.invoice_date).toBe("2026-06-20");
  });

  it("rejects changing a paid invoice back to draft", async () => {
    const invoice = await billedInvoice(env.invoices);
    await env.process({ user_id: USER, id: invoice.id, status: "paid" });

    const result = await env.process({ user_id: USER, id: invoice.id, status: "draft" });

    expect(result).toEqual({ ok: false, error: "Dieser Statuswechsel ist nicht erlaubt." });
  });
});
