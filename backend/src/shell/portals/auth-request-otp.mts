import type { Config } from "@netlify/functions";
import { requestOtpReactor } from "../../composition.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: POST /api/auth/request-otp
 * Body: { email: string }
 *
 * Step 1 of the two-step login. Generates a short-lived code, stores it hashed,
 * and sends it via email.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return error("Ungültiger Request-Body.", 400);
  }

  const result = await requestOtpReactor()({ email: body.email ?? "" });
  if (!result.ok) return error(result.error, 422);

  return json({ ok: true });
}

export const config: Config = {
  path: "/api/auth/request-otp",
};
