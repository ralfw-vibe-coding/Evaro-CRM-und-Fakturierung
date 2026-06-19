import type { Config } from "@netlify/functions";
import { createContactRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: /api/contacts
 *  - POST  -> create a contact
 */
export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "POST") {
    let body: { active?: boolean; data?: unknown };
    try {
      body = (await req.json()) as { active?: boolean; data?: unknown };
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await createContactRpu()({
      user_id: client.user_id,
      active: body.active,
      data: (body.data ?? {}) as never,
    });

    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ contact: result.contact }, 201);
  }

  return methodNotAllowed(["POST"]);
}

export const config: Config = {
  path: "/api/contacts",
};
