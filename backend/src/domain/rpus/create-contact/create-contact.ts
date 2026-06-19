import type { Channel, Contact, ContactData, Gender, Salutation } from "../../model.js";
import type { ContactsProvider } from "../../pproviders/contacts/contacts-provider.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";

/** Raw, untrusted input as it arrives from a client. */
export interface CreateContactCommand {
  user_id: string;
  active?: boolean;
  data: {
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
  };
}

export type CreateContactResult =
  | { ok: true; contact: Contact }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface CreateContactDeps {
  contacts: ContactsProvider;
  activityLog: ActivityLogProvider;
}

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

function normalizeChannels(channels: CreateContactCommand["data"]["channels"]): Channel[] {
  if (!Array.isArray(channels)) return [];
  return channels
    .map((c) => ({
      type: trimOrUndefined(c?.type) ?? "",
      address: trimOrUndefined(c?.address) ?? "",
    }))
    .filter((c) => c.type.length > 0 && c.address.length > 0);
}

/**
 * RPU: create a new contact.
 *
 * Domain rule: a contact is a human and needs a name plus at least one usable
 * communication channel (the "quick entry" minimum from crm-briefing.md).
 *
 * Write flow: the briefing describes log-first writes. For a *create* there is
 * no entity id yet, and RPUs may not generate ids (randomness is a shell
 * concern). So we let the contacts pProvider mint the id on insert and then
 * append the `contact_created` log entry with that id. Atomicity across the two
 * writes is acceptable to skip for now given the tiny user base; revisit with a
 * transactional unit-of-work if needed.
 */
export function createContact(deps: CreateContactDeps) {
  return async function process(command: CreateContactCommand): Promise<CreateContactResult> {
    const fields: Record<string, string> = {};

    const user_id = trimOrUndefined(command.user_id);
    if (!user_id) {
      return { ok: false, error: "Kein angemeldeter Benutzer." };
    }

    const first_name = trimOrUndefined(command.data?.first_name);
    const last_name = trimOrUndefined(command.data?.last_name);
    if (!first_name && !last_name) {
      fields.last_name = "Bitte einen Vor- oder Nachnamen angeben.";
    }

    const channels = normalizeChannels(command.data?.channels);
    if (channels.length === 0) {
      fields.channels = "Bitte mindestens einen Kontaktkanal angeben.";
    }

    const gender = trimOrUndefined(command.data?.gender);
    if (gender && !GENDERS.includes(gender as Gender)) {
      fields.gender = `Ungültiger Wert. Erlaubt: ${GENDERS.join(", ")}.`;
    }

    const salutation = trimOrUndefined(command.data?.salutation);
    if (salutation && !SALUTATIONS.includes(salutation as Salutation)) {
      fields.salutation = `Ungültiger Wert. Erlaubt: ${SALUTATIONS.join(", ")}.`;
    }

    if (Object.keys(fields).length > 0) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields };
    }

    const data: ContactData = {
      title: trimOrUndefined(command.data.title),
      first_name,
      last_name,
      gender: gender as Gender | undefined,
      salutation: salutation as Salutation | undefined,
      origin: trimOrUndefined(command.data.origin),
      company_text: trimOrUndefined(command.data.company_text),
      channels,
      relationship: normalizeStringList(command.data.relationship),
      role: normalizeStringList(command.data.role),
      work_area: normalizeStringList(command.data.work_area),
      interests: normalizeStringList(command.data.interests),
      tags: normalizeStringList(command.data.tags),
      notes: trimOrUndefined(command.data.notes),
    };

    const contact = await deps.contacts.insert({
      active: command.active ?? true,
      data,
    });

    await deps.activityLog.append({
      entity_type: "contact",
      entity_id: contact.id,
      user_id,
      type: "contact_created",
      payload: { data },
    });

    return { ok: true, contact };
  };
}
