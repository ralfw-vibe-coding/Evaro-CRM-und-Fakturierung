import type { Config } from "@netlify/functions";
import { createBusinessPartnerRpu, updateBusinessPartnerRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "POST") {
    let body: { types?: string[]; data?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await createBusinessPartnerRpu()({
      user_id: client.user_id,
      types: body.types,
      data: (body.data ?? {}) as never,
    });

    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ business_partner: result.business_partner }, 201);
  }

  if (req.method === "PATCH") {
    let body: { id?: string; types?: string[]; data?: unknown; expected_updated_at?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }
    if (!body.id) return error("Geschäftspartner-ID fehlt.", 400);

    const result = await updateBusinessPartnerRpu()({
      user_id: client.user_id,
      id: body.id,
      types: body.types,
      expected_updated_at: body.expected_updated_at,
      data: (body.data ?? {}) as never,
    });

    if (!result.ok) {
      const status = result.error === "Geschäftspartner nicht gefunden." ? 404 : 422;
      return error(result.error, status, { fields: result.fields });
    }
    return json({ business_partner: result.business_partner, conflict: result.conflict });
  }

  return methodNotAllowed(["POST", "PATCH"]);
}

export const config: Config = {
  path: "/api/business-partners",
};
