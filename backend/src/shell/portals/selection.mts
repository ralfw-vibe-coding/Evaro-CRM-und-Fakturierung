import type { Config } from "@netlify/functions";
import { selectReactor } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: GET /api/selection
 * Returns the initial selection in one response: { contacts, business_partners }.
 */
export default async function handler(req: Request): Promise<Response> {
  try {
    const client = await authenticate(req);
    if (!client) return error("Nicht authentifiziert.", 401);

    if (req.method !== "GET") return methodNotAllowed(["GET"]);

    const includeInactive = new URL(req.url).searchParams.get("include_inactive") === "true";
    const result = await selectReactor()({ includeInactive });
    return json(result);
  } catch (cause) {
    console.error("GET /api/selection failed", cause);
    return error("Interner Fehler beim Laden der Auswahl.", 500);
  }
}

export const config: Config = {
  path: "/api/selection",
};
