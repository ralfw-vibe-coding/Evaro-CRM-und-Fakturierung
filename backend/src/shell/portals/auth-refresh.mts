import type { Config } from "@netlify/functions";
import { tokens } from "../../composition.js";
import { authenticate } from "../http/auth.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: POST /api/auth/refresh
 * Gibt ein frisches Token mit voller Gültigkeitsdauer zurück, solange das
 * mitgeschickte noch gültig ist — so verlängert sich die Sitzung bei jeder
 * Nutzung der App ("sliding expiration"), statt hart nach 7 Tagen zu enden.
 *
 * Antwort: { token }. Bewusst ohne Benutzerprofil — der Client behält das
 * bereits vorhandene und tauscht nur das Token aus.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  // Nur Bearer-Sitzungen werden verlängert. API-Keys laufen ohnehin nicht ab;
  // für sie ein JWT auszustellen wäre eine stillschweigende Rechteausweitung.
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return error("Nicht authentifiziert.", 401);

  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  const token = await tokens().sign({
    user_id: client.user_id,
    email: client.email,
    abbr: client.abbr,
  });

  return json({ token });
}

export const config: Config = {
  path: "/api/auth/refresh",
};
