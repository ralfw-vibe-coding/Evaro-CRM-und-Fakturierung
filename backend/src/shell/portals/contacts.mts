import type { Config } from "@netlify/functions";
import { createContactRpu, updateContactRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: /api/contacts
 *  - POST  -> create a contact
 *  - PATCH -> update a contact (full record overwrite; id in the body, not the
 *             path — avoids relying on Netlify path-parameter support)
 *
 * Loading happens via GET /api/selection (contacts + business partners together).
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

  if (req.method === "PATCH") {
    let body: { id?: string; active?: boolean; data?: unknown; expected_updated_at?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }
    if (!body.id) return error("Kontakt-ID fehlt.", 400);

    const result = await updateContactRpu()({
      user_id: client.user_id,
      id: body.id,
      active: body.active,
      expected_updated_at: body.expected_updated_at,
      data: (body.data ?? {}) as never,
    });

    if (!result.ok) {
      const status = result.error === "Kontakt nicht gefunden." ? 404 : 422;
      return error(result.error, status, { fields: result.fields });
    }
    return json({ contact: result.contact, conflict: result.conflict });
  }

  return methodNotAllowed(["POST", "PATCH"]);
}

export const config: Config = {
  path: "/api/contacts",
};
