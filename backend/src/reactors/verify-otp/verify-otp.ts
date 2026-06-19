import type {
  AuthenticateUserCommand,
  AuthenticateUserResult,
} from "../../domain/rpus/authenticate-user/authenticate-user.js";
import type { TokensProvider } from "../../shell/xproviders/tokens/tokens-provider.js";

export interface VerifyOtpCommand {
  email: string;
  otp: string;
}

export type VerifyOtpResult =
  | { ok: true; token: string; user: { id: string; email: string; abbr: string } }
  | { ok: false; error: string };

export interface VerifyOtpDeps {
  /**
   * The OTP value currently accepted. For now this is the shared secret from
   * AUTH_SECRET_OTP (no per-user, emailed codes yet); a real OTP store will
   * replace this later.
   */
  acceptedOtp: string;
  authenticateUser: (command: AuthenticateUserCommand) => Promise<AuthenticateUserResult>;
  tokens: TokensProvider;
}

/**
 * Reactor: complete a login by verifying the entered OTP. Login and sign-up are
 * the same flow — the user's profile is created on first successful verify (via
 * the authenticate-user RPU). Orchestrates the OTP check (flow decision), the
 * authenticate-user RPU (user identity) and the tokens xProvider (JWT).
 */
export function verifyOtp(deps: VerifyOtpDeps) {
  return async function process(command: VerifyOtpCommand): Promise<VerifyOtpResult> {
    if (!deps.acceptedOtp) {
      return { ok: false, error: "Server-Authentifizierung ist nicht konfiguriert." };
    }
    if (command.otp !== deps.acceptedOtp) {
      return { ok: false, error: "Falscher oder abgelaufener Code." };
    }

    const auth = await deps.authenticateUser({ email: command.email });
    if (!auth.ok) return { ok: false, error: auth.error };

    const token = await deps.tokens.sign({
      user_id: auth.user.id,
      email: auth.user.email,
      abbr: auth.user.abbr,
    });

    return {
      ok: true,
      token,
      user: { id: auth.user.id, email: auth.user.email, abbr: auth.user.abbr },
    };
  };
}
