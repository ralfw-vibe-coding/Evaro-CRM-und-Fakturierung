import type { IngestItem, IngestSourceType } from "../../model.js";
import type { AnalyzeEmailImportResponse } from "../analyze-email-import/analyze-email-import.js";
import type { IngestsProvider } from "../../pproviders/ingests/ingests-provider.js";

export interface CreateIngestCommand {
  source_type: IngestSourceType;
  source_id?: string | null;
  source_label?: string | null;
  raw_text: string;
  today: string;
}

export type CreateIngestResult =
  | { ok: true; ingest: IngestItem; duplicate: boolean }
  | { ok: false; error: string };

export function createIngest(deps: {
  ingests: IngestsProvider;
  analyze: (command: { email_text: string; today: string }) => Promise<
    | { ok: true; analysis: AnalyzeEmailImportResponse }
    | { ok: false; error: string }
  >;
}) {
  return async function process(command: CreateIngestCommand): Promise<CreateIngestResult> {
    const rawText = command.raw_text.trim();
    if (rawText.length < 20) return { ok: false, error: "Der Text ist zu kurz für eine Analyse." };

    if (command.source_id) {
      const existing = await deps.ingests.findBySource(command.source_type, command.source_id);
      if (existing) return { ok: true, ingest: existing, duplicate: true };
    }

    const analysis = await deps.analyze({ email_text: rawText, today: command.today });
    if (!analysis.ok) {
      const ingest = await deps.ingests.insert({
        source_type: command.source_type,
        source_id: command.source_id,
        source_label: command.source_label,
        raw_text: rawText,
        analysis: null,
        status: "error",
        error: analysis.error,
      });
      return { ok: true, ingest, duplicate: false };
    }

    const ingest = await deps.ingests.insert({
      source_type: command.source_type,
      source_id: command.source_id,
      source_label: command.source_label,
      raw_text: rawText,
      analysis: analysis.analysis,
      status: "pending",
      error: null,
    });
    return { ok: true, ingest, duplicate: false };
  };
}
