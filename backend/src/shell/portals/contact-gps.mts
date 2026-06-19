import type { Config } from "@netlify/functions";
import { linkContactGpRpu, unlinkContactGpRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "POST") {
    let body: { contact_id?: string; gp_id?: string; role?: string; primary?: boolean };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await linkContactGpRpu()({
      user_id: client.user_id,
      contact_id: body.contact_id ?? "",
      gp_id: body.gp_id ?? "",
      role: body.role,
      primary: body.primary,
    });
    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ link: result.link });
  }

  if (req.method === "DELETE") {
    let body: { contact_id?: string; gp_id?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await unlinkContactGpRpu()({
      user_id: client.user_id,
      contact_id: body.contact_id ?? "",
      gp_id: body.gp_id ?? "",
    });
    if (!result.ok) return error(result.error, 422);
    return json({ ok: true });
  }

  return methodNotAllowed(["POST", "DELETE"]);
}

export const config: Config = {
  path: "/api/contact-gps",
};
