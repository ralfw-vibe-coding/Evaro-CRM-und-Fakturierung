import type { BusinessPartner, BusinessPartnerData } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface UpdateBusinessPartnerCommand {
  id: string;
  types: string[];
  data: BusinessPartnerData;
}

export type UpdateBusinessPartnerResult =
  | { ok: true; businessPartner: BusinessPartner; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export function updateBusinessPartner(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(
    command: UpdateBusinessPartnerCommand,
  ): Promise<UpdateBusinessPartnerResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const selection = deps.selectionStore.get();
    const current = selection?.business_partners.find((bp) => bp.id === command.id);

    const result = await deps.backendApi.updateBusinessPartner(session.token, {
      id: command.id,
      types: command.types,
      data: command.data,
      expected_updated_at: current?.updated_at,
    });
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    if (selection) {
      deps.selectionStore.set({
        ...selection,
        business_partners: selection.business_partners.map((bp) =>
          bp.id === command.id ? result.value.business_partner : bp,
        ),
      });
    }

    return {
      ok: true,
      businessPartner: result.value.business_partner,
      conflict: result.value.conflict,
    };
  };
}
