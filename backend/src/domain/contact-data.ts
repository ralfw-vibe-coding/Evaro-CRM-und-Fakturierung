import type { Channel, ContactData, Gender, Salutation } from "./model.js";

/** Raw, untrusted contact data as it arrives from a client. */
export interface RawContactData {
  title?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  salutation?: string;
  origin?: string;
  company_text?: string;
  channels?: { type?: string; address?: string }[];
  relationship?: string[];
  role?: string[];
  work_area?: string[];
  interests?: string[];
  tags?: string[];
  notes?: string;
}

export type ValidateContactDataResult =
  | { ok: true; data: ContactData }
  | { ok: false; fields: Record<string, string> };

const GENDERS: Gender[] = ["m", "f", "d"];
const SALUTATIONS: Salutation[] = ["formal", "informal"];

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const cleaned = values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeChannels(channels: RawContactData["channels"]): Channel[] {
  if (!Array.isArray(channels)) return [];
  return channels
    .map((c) => ({
      type: trimOrUndefined(c?.type) ?? "",
      address: trimOrUndefined(c?.address) ?? "",
    }))
    .filter((c) => c.type.length > 0 && c.address.length > 0);
}

function hasDirectContactChannel(channels: Channel[]): boolean {
  return channels.some((channel) => ["email", "phone", "mobile"].includes(channel.type.toLowerCase()));
}

/**
 * Shared validation/normalization for contact data, used by both the
 * create-contact and update-contact RPUs. Not itself an RPU — RPUs must stay
 * independent of each other (architektur.md), but pure helper functions are
 * fine to share.
 *
 * Domain rule: a contact is a human and needs at least a family name plus one
 * direct communication channel.
 */
export function validateContactData(raw: RawContactData): ValidateContactDataResult {
  const fields: Record<string, string> = {};

  const first_name = trimOrUndefined(raw.first_name);
  const last_name = trimOrUndefined(raw.last_name);
  if (!last_name) {
    fields.last_name = "Bitte einen Nachnamen angeben.";
  }

  const channels = normalizeChannels(raw.channels);
  if (!hasDirectContactChannel(channels)) {
    fields.channels = "Bitte mindestens eine E-Mail-Adresse oder Telefonnummer angeben.";
  }

  const gender = trimOrUndefined(raw.gender);
  if (gender && !GENDERS.includes(gender as Gender)) {
    fields.gender = `Ungültiger Wert. Erlaubt: ${GENDERS.join(", ")}.`;
  }

  const salutation = trimOrUndefined(raw.salutation);
  if (salutation && !SALUTATIONS.includes(salutation as Salutation)) {
    fields.salutation = `Ungültiger Wert. Erlaubt: ${SALUTATIONS.join(", ")}.`;
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  return {
    ok: true,
    data: {
      title: trimOrUndefined(raw.title),
      first_name,
      last_name,
      gender: gender as Gender | undefined,
      salutation: salutation as Salutation | undefined,
      origin: trimOrUndefined(raw.origin),
      company_text: trimOrUndefined(raw.company_text),
      channels,
      relationship: normalizeStringList(raw.relationship),
      role: normalizeStringList(raw.role),
      work_area: normalizeStringList(raw.work_area),
      interests: normalizeStringList(raw.interests),
      tags: normalizeStringList(raw.tags),
      notes: trimOrUndefined(raw.notes),
    },
  };
}
