import type { BusinessPartner, BusinessPartnerData, Contact, ContactData, ContactGp } from "../../model.js";

export interface AnalyzeEmailImportCommand {
  email_text: string;
  today: string;
}

export interface EmailImportProposal {
  contact: ContactData;
  business_partner: BusinessPartnerData;
}

export interface EmailImportMatch<T> {
  entity: T;
  score: number;
  reason: string;
}

export interface AnalyzeEmailImportResponse {
  proposal: EmailImportProposal;
  matches: {
    contacts: EmailImportMatch<Contact>[];
    business_partners: EmailImportMatch<BusinessPartner>[];
  };
}

export type AnalyzeEmailImportResult =
  | { ok: true; analysis: AnalyzeEmailImportResponse }
  | { ok: false; error: string };

export interface AnalyzeEmailImportDeps {
  loadSelection: () => Promise<{
    contacts: Contact[];
    business_partners: BusinessPartner[];
    contact_gps: ContactGp[];
  }>;
  extract: (text: string, today: string) => Promise<EmailImportProposal>;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeLoose(value: string | undefined): string {
  return stripDiacritics(normalize(value))
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function normalizeEmail(value: string | undefined): string {
  return normalize(value);
}

function normalizePhone(value: string | undefined): string {
  let phone = (value ?? "").replace(/\D/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  return phone;
}

function legalFormStrippedName(value: string | undefined): string {
  return normalizeLoose(value)
    .replace(/\b(gesellschaft\s+mit\s+beschraenkter\s+haftung|gesellschaft\s+mbh|gmbh|ug|ag|se|kg|ohg|gbr|ev|e\.v\.|ek|e\.k\.|ltd|limited|llc|inc|corp|co|kg)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

function bigrams(value: string): string[] {
  if (value.length <= 1) return value ? [value] : [];
  const result: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) result.push(value.slice(index, index + 2));
  return result;
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  const bCounts = new Map<string, number>();
  for (const bigram of bBigrams) bCounts.set(bigram, (bCounts.get(bigram) ?? 0) + 1);
  let intersection = 0;
  for (const bigram of aBigrams) {
    const count = bCounts.get(bigram) ?? 0;
    if (count <= 0) continue;
    intersection += 1;
    bCounts.set(bigram, count - 1);
  }
  return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function channelsOf(data: { channels: { type: string; address: string }[] }, types: string[]): string[] {
  const normalizedTypes = new Set(types.map((type) => type.toLowerCase()));
  return data.channels
    .filter((channel) => normalizedTypes.has(channel.type.toLowerCase()))
    .map((channel) => channel.address)
    .filter(Boolean);
}

function contactDisplayName(contact: Contact): string {
  return [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ").trim();
}

function scoreContact(proposal: ContactData, contact: Contact): EmailImportMatch<Contact> | null {
  const proposalLastName = normalizeLoose(proposal.last_name);
  const existingLastName = normalizeLoose(contact.data.last_name);
  if (!proposalLastName || !existingLastName) return null;

  let best: EmailImportMatch<Contact> | null = null;
  const setBest = (score: number, reason: string) => {
    if (!best || score > best.score) best = { entity: contact, score, reason };
  };

  if (proposalLastName === existingLastName) {
    const proposalEmails = new Set(channelsOf(proposal, ["email"]).map(normalizeEmail).filter(Boolean));
    const contactEmails = channelsOf(contact.data, ["email"]).map(normalizeEmail).filter(Boolean);
    if (contactEmails.some((email) => proposalEmails.has(email))) {
      setBest(100, "Nachname und E-Mail stimmen überein");
    }

    const proposalPhones = new Set(channelsOf(proposal, ["phone", "mobile"]).map(normalizePhone).filter(Boolean));
    const contactPhones = channelsOf(contact.data, ["phone", "mobile"]).map(normalizePhone).filter(Boolean);
    if (contactPhones.some((phone) => proposalPhones.has(phone))) {
      setBest(95, "Nachname und Telefonnummer stimmen überein");
    }
  }

  const proposedName = normalizeLoose([proposal.first_name, proposal.last_name].filter(Boolean).join(" "));
  const existingName = normalizeLoose(contactDisplayName(contact));
  if (proposedName && existingName) {
    const nameSimilarity = diceSimilarity(proposedName.replace(/[^a-z0-9]+/g, ""), existingName.replace(/[^a-z0-9]+/g, ""));
    if (proposalLastName === existingLastName && nameSimilarity >= 0.86) {
      setBest(80, "Name ist ähnlich");
    }
  }

  const proposedCompany = legalFormStrippedName(proposal.company_text);
  const existingCompany = legalFormStrippedName(contact.data.company_text);
  if (proposalLastName === existingLastName && diceSimilarity(proposedCompany, existingCompany) >= 0.82) {
    setBest(70, "Nachname passt, Firma ist ähnlich");
  }

  return best;
}

function scoreBusinessPartner(
  proposal: BusinessPartnerData,
  businessPartner: BusinessPartner,
): EmailImportMatch<BusinessPartner> | null {
  const proposedName = legalFormStrippedName(proposal.name);
  const existingName = legalFormStrippedName(businessPartner.data.name);
  if (!proposedName || !existingName) return null;

  const similarity = diceSimilarity(proposedName, existingName);
  let score = 0;
  let reason = "";
  if (proposedName === existingName) {
    score = 100;
    reason = "Firmenname stimmt überein";
  } else if (proposedName.includes(existingName) || existingName.includes(proposedName)) {
    score = 82;
    reason = "Firmenname ist enthalten";
  } else if (similarity >= 0.92) {
    score = 90;
    reason = "Firmenname ist sehr ähnlich";
  } else if (similarity >= 0.82) {
    score = 80;
    reason = "Firmenname ist ähnlich";
  } else if (similarity >= 0.72) {
    score = 65;
    reason = "Firmenname ist entfernt ähnlich";
  }

  if (proposal.vat_id && normalize(proposal.vat_id) === normalize(businessPartner.data.vat_id)) {
    score = Math.max(score, 100);
    reason = "USt-ID stimmt überein";
  }

  const proposedCity = normalizeLoose(proposal.address?.city);
  const existingCity = normalizeLoose(businessPartner.data.address?.city);
  if (score >= 65 && proposedCity && proposedCity === existingCity) {
    score = Math.min(100, score + 8);
    reason = `${reason}, Ort passt`;
  }

  if (score < 70) return null;
  return { entity: businessPartner, score, reason };
}

function topMatches<T>(matches: Array<EmailImportMatch<T>>): Array<EmailImportMatch<T>> {
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

function ensureProposal(proposal: EmailImportProposal): EmailImportProposal {
  return {
    contact: {
      ...proposal.contact,
      channels: proposal.contact.channels ?? [],
      tags: [...new Set([...(proposal.contact.tags ?? []), "newsletter", "ingested"])],
    },
    business_partner: {
      ...proposal.business_partner,
      name: proposal.business_partner.name || proposal.contact.company_text || "",
      address: {
        country: "Deutschland",
        ...(proposal.business_partner.address ?? {}),
      },
      channels: proposal.business_partner.channels ?? [],
      tags: [...new Set([...(proposal.business_partner.tags ?? []), "ingested"])],
    },
  };
}

export function analyzeEmailImport(deps: AnalyzeEmailImportDeps) {
  return async function process(command: AnalyzeEmailImportCommand): Promise<AnalyzeEmailImportResult> {
    const text = command.email_text.trim();
    if (text.length < 20) return { ok: false, error: "Bitte füge den E-Mail-Text ein." };

    const proposal = ensureProposal(await deps.extract(text, command.today));
    const selection = await deps.loadSelection();

    return {
      ok: true,
      analysis: {
        proposal,
        matches: {
          contacts: topMatches(selection.contacts.map((contact) => scoreContact(proposal.contact, contact)).filter(Boolean) as Array<EmailImportMatch<Contact>>),
          business_partners: topMatches(selection.business_partners.map((bp) => scoreBusinessPartner(proposal.business_partner, bp)).filter(Boolean) as Array<EmailImportMatch<BusinessPartner>>),
        },
      },
    };
  };
}
