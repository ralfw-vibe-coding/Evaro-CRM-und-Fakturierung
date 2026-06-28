import type { BusinessPartnerData, Channel } from "../../../domain/model.js";
import type {
  BusinessPartnerLookupCandidate,
  BusinessPartnerLookupResult,
  BusinessPartnerLookupSource,
} from "../../../domain/rpus/lookup-business-partner-data/lookup-business-partner-data.js";

function cleanJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

function outputText(body: unknown): string {
  const response = body as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join("\n") ?? ""
  );
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function channels(value: unknown): Channel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        type: text(row.type)?.toLowerCase() ?? "",
        address: text(row.address) ?? "",
      };
    })
    .filter((channel) => channel.type && channel.address);
}

function sources(value: unknown): BusinessPartnerLookupSource[] {
  if (!Array.isArray(value)) return [];
  const result: BusinessPartnerLookupSource[] = [];
  for (const item of value) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const url = text(row.url);
    if (!url) continue;
    result.push({
      url,
      title: text(row.title),
      fields: Array.isArray(row.fields)
        ? row.fields.map(text).filter((field): field is string => Boolean(field))
        : undefined,
    });
  }
  return result;
}

function normalizeCandidate(value: unknown): BusinessPartnerLookupCandidate | null {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const company_name = text(row.company_name);
  if (!company_name) return null;
  const address = row.address && typeof row.address === "object" ? (row.address as Record<string, unknown>) : {};
  return {
    company_name,
    confidence: number(row.confidence),
    address: {
      street: text(address.street),
      zip: text(address.zip),
      city: text(address.city),
      country: text(address.country),
    },
    vat_id: text(row.vat_id),
    channels: channels(row.channels),
    contacts_note: text(row.contacts_note),
    sources: sources(row.sources),
  };
}

function normalizeLookup(value: unknown): BusinessPartnerLookupResult {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const candidates = Array.isArray(data.candidates)
    ? data.candidates.map(normalizeCandidate).filter((candidate): candidate is BusinessPartnerLookupCandidate => Boolean(candidate))
    : [];
  return { candidates };
}

export async function lookupBusinessPartnerWithOpenAi(
  businessPartner: BusinessPartnerData,
): Promise<BusinessPartnerLookupResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY fehlt.");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      input: [
        {
          role: "system",
          content:
            "Du recherchierst Unternehmensdaten im Web. Nutze bevorzugt offizielle Quellen wie Firmenwebsite, Impressum, Kontaktseite oder Registerseiten. Antworte ausschließlich als JSON im vorgegebenen Schema. Erfinde keine USt-ID und keine Kontaktdaten. Ansprechpartner gehören nur in contacts_note.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Finde Unternehmensdaten für diesen Geschäftspartner.",
            known_business_partner: businessPartner,
            wanted_fields: [
              "vollständige Adresse: street, zip, city, country",
              "vat_id",
              "channels: email, phone, website",
              "contacts_note: Ansprechpartner mit Rolle, wenn seriös gefunden",
              "sources: URLs und Felder je Quelle",
            ],
            output_schema: {
              candidates: [
                {
                  company_name: "string",
                  confidence: "0..1",
                  address: { street: "string", zip: "string", city: "string", country: "string" },
                  vat_id: "string",
                  channels: [{ type: "email|phone|website", address: "string" }],
                  contacts_note: "string",
                  sources: [{ url: "string", title: "string", fields: ["address|vat_id|email|phone|website|contacts_note"] }],
                },
              ],
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI-Websuche fehlgeschlagen (${response.status}): ${body.slice(0, 300)}`);
  }

  const body = await response.json();
  const content = outputText(body);
  if (!content) throw new Error("OpenAI hat keine Unternehmensdaten geliefert.");
  return normalizeLookup(JSON.parse(cleanJson(content)));
}
