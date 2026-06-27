import type { BusinessPartnerData, ContactData } from "../../../domain/model.js";
import type { EmailImportProposal } from "../../../domain/rpus/analyze-email-import/analyze-email-import.js";

function cleanJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.map((item) => stringValue(item)).filter(Boolean) as string[];
  return values.length > 0 ? values : undefined;
}

function channels(value: unknown): ContactData["channels"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as { type?: unknown; address?: unknown };
      return { type: stringValue(row.type) ?? "", address: stringValue(row.address) ?? "" };
    })
    .filter((channel) => channel.type && channel.address);
}

function titleValue(value: unknown): string | undefined {
  const title = stringValue(value);
  if (!title) return undefined;
  const cleaned = title.replace(/\s+/g, " ").trim();
  const allowedParts = /^(prof\.?|professor(?:in)?|dr\.?|doktor(?:in)?|dipl\.-?[a-zäöü]+|mag\.?|mba|ll\.?m\.?|b\.?a\.?|m\.?a\.?|msc|m\.?sc\.?)$/i;
  return cleaned.split(/\s+/).every((part) => allowedParts.test(part)) ? cleaned : undefined;
}

function roleFromRejectedTitle(value: unknown): string[] {
  const title = stringValue(value);
  if (!title || titleValue(title)) return [];
  return [title];
}

function normalizeContact(value: unknown, today: string): ContactData {
  const contact = (value ?? {}) as Record<string, unknown>;
  const summary = stringValue(contact.notes);
  const roles = [...(stringList(contact.role) ?? []), ...roleFromRejectedTitle(contact.title)];
  return {
    title: titleValue(contact.title),
    first_name: stringValue(contact.first_name),
    last_name: stringValue(contact.last_name),
    gender: ["m", "f", "d"].includes(String(contact.gender)) ? (contact.gender as ContactData["gender"]) : undefined,
    salutation: ["formal", "informal"].includes(String(contact.salutation))
      ? (contact.salutation as ContactData["salutation"])
      : undefined,
    company_text: stringValue(contact.company_text),
    channels: channels(contact.channels),
    role: roles.length > 0 ? [...new Set(roles)] : undefined,
    interests: stringList(contact.interests),
    tags: ["newsletter"],
    notes: summary ? `Anfrage vom ${today}: ${summary}` : undefined,
  };
}

function normalizeBusinessPartner(value: unknown, contact: ContactData): BusinessPartnerData {
  const bp = (value ?? {}) as Record<string, unknown>;
  const address = (bp.address ?? {}) as Record<string, unknown>;
  return {
    name: stringValue(bp.name) ?? contact.company_text ?? "",
    vat_id: stringValue(bp.vat_id),
    address: {
      street: stringValue(address.street),
      zip: stringValue(address.zip),
      city: stringValue(address.city),
      country: stringValue(address.country) ?? "Deutschland",
    },
    channels: channels(bp.channels),
  };
}

export async function extractEmailImportWithOpenAi(text: string, today: string): Promise<EmailImportProposal> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY fehlt.");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extrahiere CRM-Daten aus deutschem E-Mail-Text. Antworte ausschließlich als JSON mit contact und business_partner. Verwende nur belegbare Daten; Land default Deutschland. gender: m/f/d. salutation: formal/informal. contact.title ist ausschließlich ein akademischer oder namensbezogener Titel wie Prof., Dr., Prof. Dr., Dipl.-Ing. Berufsrollen oder Funktionen wie Geschäftsführerin, CEO, Inhaber, Leiterin oder Mitarbeiterin gehören als Tags in contact.role.",
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: {
              contact: {
                first_name: "string",
                last_name: "string",
                gender: "m|f|d",
                salutation: "formal|informal",
                title: "nur akademischer/namensbezogener Titel, z.B. Prof., Dr.; keine Funktion/Rolle",
                role: ["Berufsrollen/Funktionen als Tags, z.B. Geschäftsführerin, CEO, Inhaber"],
                company_text: "string",
                channels: [{ type: "email|phone|mobile|website", address: "string" }],
                interests: ["string"],
                notes: "kurze Zusammenfassung des Anliegens ohne Datum",
              },
              business_partner: {
                name: "string",
                vat_id: "string",
                address: { street: "string", zip: "string", city: "string", country: "string" },
                channels: [{ type: "website", address: "string" }],
              },
            },
            email_text: text,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI-Analyse fehlgeschlagen (${response.status}): ${body.slice(0, 300)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI hat keine Analyse geliefert.");

  const parsed = JSON.parse(cleanJson(content)) as { contact?: unknown; business_partner?: unknown };
  const contact = normalizeContact(parsed.contact, today);
  const business_partner = normalizeBusinessPartner(parsed.business_partner, contact);
  return { contact, business_partner };
}
