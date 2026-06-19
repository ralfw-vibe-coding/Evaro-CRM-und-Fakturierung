import type { BusinessPartner, Contact } from "@/domain/model";
import type { Scope, SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export interface MatchHint {
  label: string;
  snippet: string;
}

export type VisibleEntity =
  | { kind: "contact"; contact: Contact; matchHint?: MatchHint }
  | { kind: "business_partner"; businessPartner: BusinessPartner; matchHint?: MatchHint };

export interface GetVisibleEntitiesResult {
  entities: VisibleEntity[];
  scope: Scope;
  searchTerm: string;
  counts: { contacts: number; businessPartners: number };
}

export interface GetVisibleEntitiesDeps {
  selectionStore: SelectionStoreProvider;
}

/** Search tier: 1 = name/company (highest priority), 2 = channels/notes/memo, 3 = address. */
type Tier = 1 | 2 | 3;

interface FieldMatch {
  tier: Tier;
  field: string;
  label: string;
  value: string;
}

interface Ranked {
  entity: VisibleEntity;
  tier: Tier;
}

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function find(
  term: string,
  candidates: [string, string, string | undefined][],
  tier: Tier,
): FieldMatch | null {
  for (const [field, label, value] of candidates) {
    if (value && value.toLowerCase().includes(term)) {
      return { tier, field, label, value };
    }
  }
  return null;
}

function matchContact(contact: Contact, term: string): FieldMatch | null {
  const tier1 = find(
    term,
    [
      ["first_name", "Vorname", contact.data.first_name],
      ["last_name", "Nachname", contact.data.last_name],
      ["company_text", "Firma", contact.data.company_text],
    ],
    1,
  );
  if (tier1) return tier1;

  for (const channel of contact.data.channels) {
    if (channel.address.toLowerCase().includes(term)) {
      return { tier: 2, field: "channel", label: "Kontaktkanal", value: channel.address };
    }
  }
  return find(term, [["notes", "Notizen", contact.data.notes]], 2);
}

function matchBusinessPartner(bp: BusinessPartner, term: string): FieldMatch | null {
  if (bp.data.name.toLowerCase().includes(term)) {
    return { tier: 1, field: "name", label: "Name", value: bp.data.name };
  }

  for (const channel of bp.data.channels) {
    if (channel.address.toLowerCase().includes(term)) {
      return { tier: 2, field: "channel", label: "Kontaktkanal", value: channel.address };
    }
  }
  const tier2 = find(
    term,
    [
      ["notes", "Notizen", bp.data.notes],
      ["memo", "Memo", bp.data.memo],
    ],
    2,
  );
  if (tier2) return tier2;

  const address = bp.data.address;
  return find(
    term,
    [
      ["street", "Straße", address?.street],
      ["zip", "PLZ", address?.zip],
      ["city", "Ort", address?.city],
      ["country", "Land", address?.country],
    ],
    3,
  );
}

/** Whether a match already shows up elsewhere on the overview card. */
function isMatchVisible(entity: VisibleEntity, match: FieldMatch): boolean {
  if (match.tier === 1) return true;

  if (entity.kind === "contact") {
    if (match.field !== "channel") return false;
    const shownEmail = entity.contact.data.channels.find((c) => c.type === "email")?.address;
    const shownPhone = entity.contact.data.channels.find((c) => c.type === "phone")?.address;
    return match.value === shownEmail || match.value === shownPhone;
  }

  if (match.field === "city") return true;
  if (match.field !== "channel") return false;
  const channels = entity.businessPartner.data.channels;
  const shown =
    channels.find((c) => c.type === "website")?.address ??
    channels.find((c) => c.type === "email")?.address ??
    channels[0]?.address;
  return match.value === shown;
}

function sortKey(entity: VisibleEntity): string {
  return entity.kind === "contact"
    ? entity.contact.data.last_name ?? entity.contact.data.first_name ?? ""
    : entity.businessPartner.data.name;
}

function rankContacts(contacts: Contact[], term: string, searching: boolean): Ranked[] {
  const ranked: Ranked[] = [];
  for (const contact of contacts) {
    const match = searching ? matchContact(contact, term) : null;
    if (searching && !match) continue;
    const entity: VisibleEntity = { kind: "contact", contact };
    if (match && !isMatchVisible(entity, match)) {
      entity.matchHint = { label: match.label, snippet: truncate(match.value) };
    }
    ranked.push({ entity, tier: match?.tier ?? 1 });
  }
  return ranked;
}

function rankBusinessPartners(bps: BusinessPartner[], term: string, searching: boolean): Ranked[] {
  const ranked: Ranked[] = [];
  for (const bp of bps) {
    const match = searching ? matchBusinessPartner(bp, term) : null;
    if (searching && !match) continue;
    const entity: VisibleEntity = { kind: "business_partner", businessPartner: bp };
    if (match && !isMatchVisible(entity, match)) {
      entity.matchHint = { label: match.label, snippet: truncate(match.value) };
    }
    ranked.push({ entity, tier: match?.tier ?? 1 });
  }
  return ranked;
}

/**
 * RPU (Query): projects the stored selection into one list for the overview —
 * contacts and business partners mixed, filtered by the active scope and, when
 * a search term is set, by a full-text match across name/company (tier 1),
 * channels/notes/memo (tier 2), and address (tier 3). Results are sorted by
 * match priority first, then by name within a tier. Pure domain logic; knows
 * nothing about React or the DOM.
 */
export function getVisibleEntities(deps: GetVisibleEntitiesDeps) {
  return function process(): GetVisibleEntitiesResult {
    const selection = deps.selectionStore.get();
    const scope = deps.selectionStore.getScope();
    const searchTerm = deps.selectionStore.getSearchTerm();
    const term = searchTerm.trim().toLowerCase();
    const searching = term.length > 0;

    const rankedContacts = rankContacts(selection?.contacts ?? [], term, searching);
    const rankedBps = rankBusinessPartners(selection?.business_partners ?? [], term, searching);

    const entities = [
      ...(scope !== "gp" ? rankedContacts : []),
      ...(scope !== "contacts" ? rankedBps : []),
    ]
      .sort((a, b) => {
        if (searching && a.tier !== b.tier) return a.tier - b.tier;
        return sortKey(a.entity).localeCompare(sortKey(b.entity), "de");
      })
      .map((r) => r.entity);

    return {
      entities,
      scope,
      searchTerm,
      counts: { contacts: rankedContacts.length, businessPartners: rankedBps.length },
    };
  };
}
