import type { Config } from "@netlify/functions";
import { verifyOtpReactor } from "../../composition.js";
import { json, error, methodNotAllowed } from "../http/responses.js";

/**
 * Portal: POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 * Returns: { token, user } on success. The user profile is created on first
 * successful verify (login and sign-up are the same flow).
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  let body: { email?: string; otp?: string };
  try {
    body = (await req.json()) as { email?: string; otp?: string };
  } catch {
    return error("Ungültiger Request-Body.", 400);
  }

  const result = await verifyOtpReactor()({
    email: body.email ?? "",
    otp: body.otp ?? "",
  });

  if (!result.ok) return error(result.error, 401);
  return json({ token: result.token, user: result.user });
}

export const config: Config = {
  path: "/api/auth/verify-otp",
};
