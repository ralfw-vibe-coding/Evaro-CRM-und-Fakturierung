import type { SessionUser } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface UpdateProfileCommand {
  abbr: string;
}

export type UpdateProfileResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; fields?: Record<string, string> };

export function updateProfile(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}) {
  return async function process(command: UpdateProfileCommand): Promise<UpdateProfileResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.updateProfile(session.token, { abbr: command.abbr });
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    deps.session.save({ token: session.token, user: result.value.user });
    return { ok: true, user: result.value.user };
  };
}
