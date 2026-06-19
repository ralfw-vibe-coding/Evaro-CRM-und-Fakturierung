import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { SessionUser } from "@/domain/model";

export interface VerifyOtpCommand {
  email: string;
  otp: string;
}

export type VerifyOtpResult = { ok: true; user: SessionUser } | { ok: false; error: string };

export interface VerifyOtpDeps {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}

/**
 * RPU: step 2 of login — verify the OTP and, on success, start the session
 * (save token + user via the session pProvider).
 */
export function verifyOtp(deps: VerifyOtpDeps) {
  return async function process(command: VerifyOtpCommand): Promise<VerifyOtpResult> {
    const result = await deps.backendApi.verifyOtp(command.email.trim(), command.otp.trim());
    if (!result.ok) return { ok: false, error: result.error };

    deps.session.save({ token: result.value.token, user: result.value.user });
    return { ok: true, user: result.value.user };
  };
}
