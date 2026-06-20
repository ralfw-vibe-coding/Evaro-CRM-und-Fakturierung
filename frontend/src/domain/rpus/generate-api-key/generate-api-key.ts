import type { SessionUser } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type GenerateApiKeyResult =
  | { ok: true; user: SessionUser; api_key: string }
  | { ok: false; error: string };

export function generateApiKey(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}) {
  return async function process(): Promise<GenerateApiKeyResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.generateApiKey(session.token);
    if (!result.ok) return { ok: false, error: result.error };

    deps.session.save({ token: session.token, user: result.value.user });
    return { ok: true, user: result.value.user, api_key: result.value.api_key };
  };
}
