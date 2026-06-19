import type { Config } from "@netlify/functions";
import { selectReactor } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: GET /api/selection
 * Returns the initial selection in one response: { contacts, business_partners }.
 */
export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method !== "GET") return methodNotAllowed(["GET"]);

  const result = await selectReactor()();
  return json(result);
}

export const config: Config = {
  path: "/api/selection",
};
