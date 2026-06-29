import type { IngestItem } from "../../model.js";

export interface CheckEmailIngestResult {
  imported: IngestItem[];
  duplicates: number;
}

export function checkEmailIngest(deps: {
  fetchUnseen: () => Promise<Array<{ source_id: string; source_label: string; raw_text: string }>>;
  createIngest: (command: {
    source_type: "email";
    source_id: string;
    source_label: string;
    raw_text: string;
    today: string;
  }) => Promise<{ ok: true; ingest: IngestItem; duplicate: boolean } | { ok: false; error: string }>;
}) {
  return async function process(command: { today: string }): Promise<CheckEmailIngestResult> {
    const mails = await deps.fetchUnseen();
    const imported: IngestItem[] = [];
    let duplicates = 0;
    for (const mail of mails) {
      const result = await deps.createIngest({
        source_type: "email",
        source_id: mail.source_id,
        source_label: mail.source_label,
        raw_text: mail.raw_text,
        today: command.today,
      });
      if (!result.ok) continue;
      if (result.duplicate) duplicates += 1;
      else imported.push(result.ingest);
    }
    return { imported, duplicates };
  };
}
