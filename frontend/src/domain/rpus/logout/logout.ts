import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface LogoutDeps {
  session: SessionProvider;
}

/** RPU (Command): end the current session. */
export function logout(deps: LogoutDeps) {
  return function process(): void {
    deps.session.clear();
  };
}
