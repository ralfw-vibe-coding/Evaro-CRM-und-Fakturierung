import type { User, UsersProvider } from "../../pproviders/users/users-provider.js";

export interface AuthenticateUserCommand {
  email: string;
}

export type AuthenticateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export interface AuthenticateUserDeps {
  users: UsersProvider;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Derive a short identifier (e.g. "petra.paulsen@x.de" -> "PP"). */
function deriveAbbr(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : local.slice(0, 2);
  return letters.toUpperCase() || "??";
}

/**
 * RPU: ensure a user exists for the given email (find-or-create) and return it.
 * The actual credential check (OTP / secret password) happens in the shell;
 * this RPU only owns user identity state.
 */
export function authenticateUser(deps: AuthenticateUserDeps) {
  return async function process(
    command: AuthenticateUserCommand,
  ): Promise<AuthenticateUserResult> {
    const email = command.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return { ok: false, error: "Ungültige E-Mail-Adresse." };
    }

    const existing = await deps.users.findByEmail(email);
    if (existing) return { ok: true, user: existing };

    const user = await deps.users.insert({ email, abbr: deriveAbbr(email) });
    return { ok: true, user };
  };
}
