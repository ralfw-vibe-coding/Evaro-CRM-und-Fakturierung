import type { EmailImportAnalysis } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type AnalyzeEmailImportResult =
  | { ok: true; analysis: EmailImportAnalysis }
  | { ok: false; error: string };

export function analyzeEmailImport(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
}) {
  return async function process(emailText: string): Promise<AnalyzeEmailImportResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };

    const result = await deps.backendApi.analyzeEmailImport(session.token, emailText);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, analysis: result.value };
  };
}
