import type { Config } from "@netlify/functions";
import { updateUserProfileRpu } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "PATCH") {
    let body: { abbr?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await updateUserProfileRpu()({
      user_id: client.user_id,
      abbr: body.abbr ?? "",
    });

    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ user: { id: result.user.id, email: result.user.email, abbr: result.user.abbr } });
  }

  return methodNotAllowed(["PATCH"]);
}

export const config: Config = {
  path: "/api/profile",
};
