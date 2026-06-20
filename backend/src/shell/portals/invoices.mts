import type { Config } from "@netlify/functions";
import { createInvoiceDraftRpu, listInvoicingDataRpu, updateInvoiceDraftRpu } from "../../composition.js";
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
    let body: { id?: string; data?: unknown; vat_rate?: unknown; expected_updated_at?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
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
