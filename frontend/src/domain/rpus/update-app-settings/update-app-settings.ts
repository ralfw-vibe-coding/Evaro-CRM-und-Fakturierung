import type { AppSettings, InvoicingAppSettings } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type UpdateAppSettingsResult =
  | { ok: true; settings: AppSettings }
  | { ok: false; error: string };

export function updateAppSettings(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}) {
  return async function process(input: { invoicing: InvoicingAppSettings }): Promise<UpdateAppSettingsResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.updateAppSettings(session.token, input);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, settings: result.value.settings };
  };
}
