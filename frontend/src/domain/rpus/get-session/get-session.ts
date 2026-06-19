import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { SessionUser } from "@/domain/model";

export interface GetSessionDeps {
  session: SessionProvider;
}

/** RPU (Query): the currently logged-in user, if any. */
export function getSession(deps: GetSessionDeps) {
  return function process(): SessionUser | null {
    return deps.session.get()?.user ?? null;
  };
}
