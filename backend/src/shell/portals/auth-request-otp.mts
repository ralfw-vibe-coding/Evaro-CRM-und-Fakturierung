import type { Config } from "@netlify/functions";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: POST /api/auth/request-otp
 * Body: { email: string }
 *
 * Step 1 of the two-step login. Normally this would generate a one-time code
 * and email it. There is no mail delivery yet, so for now the only accepted OTP
 * is the shared secret (AUTH_SECRET_OTP) and this endpoint just acknowledges the
 * request. Login and sign-up are the same flow.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return error("Ungültiger Request-Body.", 400);
  }

  if (!body.email || !body.email.trim()) {
    return error("Bitte eine E-Mail-Adresse angeben.", 400);
  }

  return json({ ok: true });
}

export const config: Config = {
  path: "/api/auth/request-otp",
};
