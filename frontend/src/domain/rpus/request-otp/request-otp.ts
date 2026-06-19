import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";

export interface RequestOtpCommand {
  email: string;
}

export type RequestOtpResult = { ok: true } | { ok: false; error: string };

export interface RequestOtpDeps {
  backendApi: BackendApiProvider;
}

/** RPU: step 1 of login — ask the backend to make an OTP available. */
export function requestOtp(deps: RequestOtpDeps) {
  return async function process(command: RequestOtpCommand): Promise<RequestOtpResult> {
    const email = command.email.trim();
    if (!email) return { ok: false, error: "Bitte eine E-Mail-Adresse angeben." };

    const result = await deps.backendApi.requestOtp(email);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  };
}
