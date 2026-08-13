import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface RefreshSessionDeps {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}

/**
 * RPU (Command): verlängert die laufende Sitzung.
 *
 * Das Backend stellt ein Token mit voller Gültigkeitsdauer aus, solange das
 * vorhandene noch gilt. Bei jeder Nutzung der App aufgerufen, läuft die
 * Sitzung dadurch nur noch nach echter Inaktivität ab.
 *
 * Das Benutzerprofil bleibt unangetastet — es wird nur das Token getauscht.
 *
 * Schlägt der Aufruf fehl, passiert bewusst nichts: ein abgelaufenes Token
 * fällt ohnehin beim nächsten regulären Aufruf auf, und ein kurzer Netzausfall
 * darf niemanden aus der Sitzung werfen. Der Statuscode ist hier nicht
 * verfügbar, beide Fälle sind also nicht unterscheidbar.
 */
export function refreshSession(deps: RefreshSessionDeps) {
  return async function process(): Promise<{ ok: boolean }> {
    const session = deps.session.get();
    if (!session) return { ok: false };

    const result = await deps.backendApi.refreshToken(session.token);
    if (!result.ok) return { ok: false };

    deps.session.save({ token: result.value.token, user: session.user });
    return { ok: true };
  };
}
