import type { BusinessPartner, BusinessPartnerData } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export interface CreateBusinessPartnerCommand {
  types: string[];
  data: BusinessPartnerData;
}

export type CreateBusinessPartnerResult =
  | { ok: true; businessPartner: BusinessPartner }
  | { ok: false; error: string; fields?: Record<string, string> };

export function createBusinessPartner(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return async function process(
    command: CreateBusinessPartnerCommand,
  ): Promise<CreateBusinessPartnerResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.createBusinessPartner(session.token, command);
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };

    const selection = deps.selectionStore.get();
    if (selection) {
      deps.selectionStore.set({
        ...selection,
        business_partners: [...selection.business_partners, result.value.business_partner],
      });
    }

    return { ok: true, businessPartner: result.value.business_partner };
  };
}
