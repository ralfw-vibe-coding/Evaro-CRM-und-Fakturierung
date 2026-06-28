import type { Config } from "@netlify/functions";
import { lookupBusinessPartnerDataRpu } from "../../composition.js";
import type { BusinessPartnerData } from "../../domain/model.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  let body: { business_partner?: BusinessPartnerData };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return error("Ungültiger Request-Body.", 400);
  }

  try {
    const result = await lookupBusinessPartnerDataRpu()({
      business_partner: body.business_partner ?? { name: "", channels: [] },
    });
    if (!result.ok) return error(result.error, 422);
    return json(result.lookup);
  } catch (cause) {
    console.error("POST /api/business-partner-lookup failed", cause);
    const message = cause instanceof Error ? cause.message : "Die Unternehmensdaten konnten nicht gesucht werden.";
    return error(message, 500);
  }
}

export const config: Config = {
  path: "/api/business-partner-lookup",
};
