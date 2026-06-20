import type { Config } from "@netlify/functions";
import { createPaymentTermRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "POST") {
    let body: { label?: string; template?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await createPaymentTermRpu()({
      label: body.label,
      template: body.template,
    });

    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ payment_term: result.payment_term }, 201);
  }

  return methodNotAllowed(["POST"]);
}

export const config: Config = {
  path: "/api/payment-terms",
};
