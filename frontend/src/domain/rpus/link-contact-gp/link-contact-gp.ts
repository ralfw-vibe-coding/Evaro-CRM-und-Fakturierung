import type { ContactGp } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface LinkContactGpCommand {
  contact_id: string;
  gp_id: string;
  role?: string;
  primary?: boolean;
}

export type LinkContactGpResult =
  | { ok: true; link: ContactGp }
  | { ok: false; error: string; fields?: Record<string, string> };

export function linkContactGp(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(command: LinkContactGpCommand): Promise<LinkContactGpResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.linkContactGp(session.token, command);
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    const selection = deps.selectionStore.get();
    if (selection) {
      const withoutExisting = selection.contact_gps
        .filter((link) => !(link.contact_id === command.contact_id && link.gp_id === command.gp_id))
        .map((link) =>
          result.value.link.primary && link.contact_id === command.contact_id
            ? { ...link, primary: false }
            : link,
        );
      deps.selectionStore.set({
        ...selection,
        contact_gps: [...withoutExisting, result.value.link],
      });
    }

    return { ok: true, link: result.value.link };
  };
}
