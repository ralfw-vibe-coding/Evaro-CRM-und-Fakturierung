import type { BusinessPartnerData } from "@/domain/model";
import type { BackendApiProvider, BusinessPartnerLookupResult } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type LookupBusinessPartnerResult =
  | { ok: true; lookup: BusinessPartnerLookupResult }
  | { ok: false; error: string };

export function lookupBusinessPartner(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}) {
  return async function process(data: BusinessPartnerData): Promise<LookupBusinessPartnerResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.lookupBusinessPartner(session.token, data);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, lookup: result.value };
  };
}
