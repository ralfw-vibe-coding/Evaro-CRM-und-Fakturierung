import type { Config } from "@netlify/functions";
import { billInvoiceRpu, changeInvoiceStatusRpu, createInvoiceDraftRpu, listInvoicingDataRpu, updateInvoiceDraftRpu } from "../../composition.js";
import type { InvoiceStatus } from "../../domain/model.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "GET") {
    return json(await listInvoicingDataRpu()());
  }

  if (req.method === "POST") {
    let body: { business_partner_id?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await createInvoiceDraftRpu()({
      user_id: client.user_id,
      business_partner_id: body.business_partner_id ?? "",
    });

    if (!result.ok) {
      const status = result.error === "Geschäftspartner nicht gefunden." ? 404 : 422;
      return error(result.error, status);
    }
    return json({ invoice: result.invoice }, 201);
  }

  if (req.method === "PATCH") {
    let body: { id?: string; action?: string; status?: InvoiceStatus; data?: unknown; vat_rate?: unknown; expected_updated_at?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    if (body.action === "bill") {
      const result = await billInvoiceRpu()({
        user_id: client.user_id,
        id: body.id ?? "",
      });
      if (!result.ok) {
        const status = result.error === "Rechnung nicht gefunden." ? 404 : 422;
        return error(result.error, status);
      }
      return json({ invoice: result.invoice });
    }

    if (body.action === "status" || body.status) {
      if (body.status !== "draft" && body.status !== "billed" && body.status !== "paid") {
        return error("Ungültiger Rechnungsstatus.", 400);
      }
      const result = await changeInvoiceStatusRpu()({
        user_id: client.user_id,
        id: body.id ?? "",
        status: body.status,
      });
      if (!result.ok) {
        const status = result.error === "Rechnung nicht gefunden." ? 404 : 422;
        return error(result.error, status);
      }
      return json({ invoice: result.invoice });
    }

    const result = await updateInvoiceDraftRpu()({
      id: body.id ?? "",
      data: body.data ?? {},
      vat_rate: body.vat_rate,
      expected_updated_at: body.expected_updated_at,
    });

    if (!result.ok) {
      const status = result.error === "Rechnung nicht gefunden." ? 404 : 422;
      return error(result.error, status, { fields: result.fields });
    }
    return json({ invoice: result.invoice, conflict: result.conflict });
  }

  return methodNotAllowed(["GET", "POST", "PATCH"]);
}

export const config: Config = {
  path: "/api/invoices",
};
