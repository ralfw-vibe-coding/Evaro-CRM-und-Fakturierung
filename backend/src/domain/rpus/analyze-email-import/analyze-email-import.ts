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

function words(value: string | undefined): string[] {
  return normalize(value)
    .split(/[^a-z0-9äöüß]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function channelsOf(data: { channels: { type: string; address: string }[] }, type: string): string[] {
  return data.channels
    .filter((channel) => channel.type.toLowerCase() === type)
    .map((channel) => normalize(channel.address))
    .filter(Boolean);
}

function contactDisplayName(contact: Contact): string {
  return [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ").trim();
}

function scoreContact(proposal: ContactData, contact: Contact): EmailImportMatch<Contact> | null {
  let score = 0;
  const reasons: string[] = [];
  const proposalEmails = new Set(channelsOf(proposal, "email"));
  const contactEmails = channelsOf(contact.data, "email");
  if (contactEmails.some((email) => proposalEmails.has(email))) {
    score += 90;
    reasons.push("E-Mail stimmt überein");
  }

  const proposedName = normalize([proposal.first_name, proposal.last_name].filter(Boolean).join(" "));
  const existingName = normalize(contactDisplayName(contact));
  if (proposedName && existingName && (proposedName === existingName || existingName.includes(proposedName) || proposedName.includes(existingName))) {
    score += 45;
    reasons.push("Name passt");
  } else if (proposal.last_name && normalize(proposal.last_name) === normalize(contact.data.last_name)) {
    score += 25;
    reasons.push("Nachname passt");
  }

  const proposedCompany = normalize(proposal.company_text);
  const existingCompany = normalize(contact.data.company_text);
  if (proposedCompany && existingCompany && (proposedCompany === existingCompany || existingCompany.includes(proposedCompany) || proposedCompany.includes(existingCompany))) {
    score += 20;
    reasons.push("Firma passt");
  }

  if (score < 20) return null;
  return { entity: contact, score, reason: reasons.join(", ") };
}

function scoreBusinessPartner(
  proposal: BusinessPartnerData,
  businessPartner: BusinessPartner,
): EmailImportMatch<BusinessPartner> | null {
  let score = 0;
  const reasons: string[] = [];
  const proposedName = normalize(proposal.name);
  const existingName = normalize(businessPartner.data.name);
  if (proposedName && existingName && (proposedName === existingName || existingName.includes(proposedName) || proposedName.includes(existingName))) {
    score += 60;
    reasons.push("Name passt");
  } else {
    const proposedWords = new Set(words(proposal.name));
    const overlap = words(businessPartner.data.name).filter((word) => proposedWords.has(word)).length;
    if (overlap > 0) {
      score += Math.min(35, overlap * 12);
      reasons.push("Namensbestandteile passen");
    }
  }

  if (proposal.vat_id && normalize(proposal.vat_id) === normalize(businessPartner.data.vat_id)) {
    score += 80;
    reasons.push("USt-ID stimmt überein");
  }

  const proposedWebsites = new Set(channelsOf(proposal, "website"));
  const existingWebsites = channelsOf(businessPartner.data, "website");
  if (existingWebsites.some((website) => proposedWebsites.has(website))) {
    score += 45;
    reasons.push("Website stimmt überein");
  }

  if (score < 20) return null;
  return { entity: businessPartner, score, reason: reasons.join(", ") };
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
