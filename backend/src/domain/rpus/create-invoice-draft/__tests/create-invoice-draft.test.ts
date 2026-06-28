import { beforeEach, describe, expect, it } from "vitest";
import { createInvoiceDraft } from "../create-invoice-draft.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";
import { InMemoryAppSettingsProvider } from "../../../pproviders/app-settings/in-memory-app-settings-provider.js";
import { InMemoryBusinessPartnersProvider } from "../../../pproviders/business-partners/in-memory-business-partners-provider.js";
import { InMemoryInvoicesProvider } from "../../../pproviders/invoices/in-memory-invoices-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";

function setup() {
  const businessPartners = new InMemoryBusinessPartnersProvider();
  const invoices = new InMemoryInvoicesProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const appSettings = new InMemoryAppSettingsProvider();
  const process = createInvoiceDraft({ businessPartners, invoices, appSettings, activityLog });
  return { businessPartners, invoices, appSettings, activityLog, process };
}

describe("createInvoiceDraft RPU", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  it("creates a persisted draft with a frozen business-partner snapshot", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Acme GmbH",
        vat_id: "DE123",
        address: { street: "Markt 1", zip: "20095", city: "Hamburg", country: "DE" },
        channels: [{ type: "email", address: "rechnung@acme.test" }],
      },
    });

    const result = await env.process({ user_id: USER, business_partner_id: bp.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.status).toBe("draft");
    expect(result.invoice.invoice_number).toBeNull();
    expect(result.invoice.vat_rate).toBe(0);
    expect(result.invoice.data.reverse_charge).toBe(true);
    expect(result.invoice.gp_snapshot).toEqual({
      name: "Acme GmbH",
      vat_id: "DE123",
      address: { street: "Markt 1", zip: "20095", city: "Hamburg", country: "DE" },
      email: "rechnung@acme.test",
    });

    const stored = await env.invoices.listAll();
    expect(stored).toHaveLength(1);
    expect(stored[0].business_partner_id).toBe(bp.id);
  });

  it("writes an activity entry on the business partner", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: { name: "Acme GmbH", channels: [] },
    });

    const result = await env.process({ user_id: USER, business_partner_id: bp.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const log = await env.activityLog.listForEntity("business_partner", bp.id);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("invoice_draft_created");
    expect(log[0].payload).toEqual({ invoice_id: result.invoice.id });
  });

  it("rejects an unknown business partner", async () => {
    const result = await env.process({ user_id: USER, business_partner_id: "missing" });
    expect(result).toEqual({ ok: false, error: "Geschäftspartner nicht gefunden." });
  });

  it("sets 20% VAT for Bulgarian recipients", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Sofia Client",
        address: { country: "Bulgaria" },
        channels: [],
      },
    });

    const result = await env.process({ user_id: USER, business_partner_id: bp.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.vat_rate).toBe(20);
    expect(result.invoice.data.reverse_charge).toBe(false);
  });

  it("sets domestic VAT for German recipients without VAT ID", async () => {
    const bp = await env.businessPartners.insert({
      types: [],
      data: {
        name: "Berlin Client",
        address: { country: "Deutschland" },
        channels: [],
      },
    });

    const result = await env.process({ user_id: USER, business_partner_id: bp.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.vat_rate).toBe(19);
    expect(result.invoice.data.reverse_charge).toBe(false);
  });
});
