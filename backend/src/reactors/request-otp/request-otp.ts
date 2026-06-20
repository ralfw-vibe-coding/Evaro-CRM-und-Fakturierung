import { createHash, randomInt } from "node:crypto";
import type { OtpProvider } from "../../shell/xproviders/otp/otp-provider.js";
import type { ResendEmailProvider } from "../../shell/xproviders/email/resend-email-provider.js";

export interface RequestOtpCommand {
  email: string;
}

export type RequestOtpResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRES_IN_MINUTES = 10;

export function hashOtp(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 1_000_000));
}

export function requestOtp(deps: {
  otps: OtpProvider;
  email: Pick<ResendEmailProvider, "sendOtpEmail">;
}) {
  return async function process(command: RequestOtpCommand): Promise<RequestOtpResult> {
    const email = command.email.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return { ok: false, error: "Ungültige E-Mail-Adresse." };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + EXPIRES_IN_MINUTES * 60_000).toISOString();
    await deps.otps.store({ email, code_hash: hashOtp(email, code), expires_at: expiresAt });
    await deps.email.sendOtpEmail({ to: email, code, expiresInMinutes: EXPIRES_IN_MINUTES });
    return { ok: true };
  };
}
