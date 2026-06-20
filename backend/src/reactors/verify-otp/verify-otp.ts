import type {
  AuthenticateUserCommand,
  AuthenticateUserResult,
} from "../../domain/rpus/authenticate-user/authenticate-user.js";
import { hashOtp } from "../request-otp/request-otp.js";
import type { OtpProvider } from "../../shell/xproviders/otp/otp-provider.js";
import type { TokensProvider } from "../../shell/xproviders/tokens/tokens-provider.js";

export interface VerifyOtpCommand {
  email: string;
  otp: string;
}

export type VerifyOtpResult =
  | { ok: true; token: string; user: { id: string; email: string; abbr: string } }
  | { ok: false; error: string };

export interface VerifyOtpDeps {
  otps: OtpProvider;
  fallbackOtp?: string;
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
    const email = command.email.trim().toLowerCase();
    const otp = command.otp.trim();
    const consumed = await deps.otps.consume(email, hashOtp(email, otp), new Date());
    const fallbackAccepted = Boolean(deps.fallbackOtp && otp === deps.fallbackOtp);
    if (!consumed && !fallbackAccepted) {
      return { ok: false, error: "Falscher oder abgelaufener Code." };
    }

    const auth = await deps.authenticateUser({ email });
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
