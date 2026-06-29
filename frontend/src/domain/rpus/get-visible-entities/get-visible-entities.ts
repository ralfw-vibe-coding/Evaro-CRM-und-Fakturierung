import type { BusinessPartner, Contact } from "@/domain/model";
import type {
  Scope,
  SelectedTagFilter,
  SelectionStoreProvider,
} from "@/domain/pproviders/selection-store/selection-store-provider";

export interface MatchHint {
  label: string;
  snippet: string;
}

export type VisibleEntity =
  | { kind: "contact"; contact: Contact; connectionCount: number; companyFallback?: string; matchHint?: MatchHint }
  | { kind: "business_partner"; businessPartner: BusinessPartner; connectionCount: number; matchHint?: MatchHint };

export interface GetVisibleEntitiesResult {
  entities: VisibleEntity[];
  scope: Scope;
  searchTerm: string;
  includeInactive: boolean;
  selectedTags: SelectedTagFilter[];
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

function matchContact(contact: Contact, term: string, companyFallback?: string): FieldMatch | null {
  const tier1 = find(
    term,
    [
      ["first_name", "Vorname", contact.data.first_name],
      ["last_name", "Nachname", contact.data.last_name],
      ["company_text", "Firma", contact.data.company_text ?? companyFallback],
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

function splitTags(value: string | undefined): string[] {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

function entityTagsByCategory(entity: VisibleEntity): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  function add(category: string, values: string[]) {
    const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (normalized.length === 0) return;
    result.set(category, new Set(normalized));
  }

  if (entity.kind === "contact") {
    const data = entity.contact.data;
    add("contact.origin", splitTags(data.origin));
    add("contact.relationship", data.relationship ?? []);
    add("contact.role", data.role ?? []);
    add("contact.work_area", data.work_area ?? []);
    add("contact.interests", data.interests ?? []);
    add("contact.tags", data.tags ?? []);
    return result;
  }

  add("businessPartner.types", entity.businessPartner.types);
  add("businessPartner.business_relationship", entity.businessPartner.data.business_relationship ?? []);
  add("businessPartner.tags", entity.businessPartner.data.tags ?? []);
  return result;
}

function matchesTags(entity: VisibleEntity, selectedTags: SelectedTagFilter[]): boolean {
  if (selectedTags.length === 0) return true;
  const entityTags = entityTagsByCategory(entity);
  const selectedByCategory = new Map<string, Set<string>>();
  for (const selected of selectedTags) {
    const category = selected.category.trim();
    const tag = selected.tag.trim().toLowerCase();
    if (!category || !tag) continue;
    selectedByCategory.set(category, selectedByCategory.get(category) ?? new Set());
    selectedByCategory.get(category)!.add(tag);
  }

  for (const [category, requiredTags] of selectedByCategory) {
    const entityCategoryTags = entityTags.get(category);
    if (!entityCategoryTags) return false;
    const matchesCategory = [...requiredTags].some((tag) => entityCategoryTags.has(tag));
    if (!matchesCategory) return false;
  }
  return true;
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

function rankContacts(
  contacts: Contact[],
  connectionCounts: Map<string, number>,
  companyFallbacks: Map<string, string>,
  term: string,
  searching: boolean,
): Ranked[] {
  const ranked: Ranked[] = [];
  for (const contact of contacts) {
    const companyFallback = contact.data.company_text?.trim() ? undefined : companyFallbacks.get(contact.id);
    const match = searching ? matchContact(contact, term, companyFallback) : null;
    if (searching && !match) continue;
    const entity: VisibleEntity = {
      kind: "contact",
      contact,
      connectionCount: connectionCounts.get(contact.id) ?? 0,
      companyFallback,
    };
    if (match && !isMatchVisible(entity, match)) {
      entity.matchHint = { label: match.label, snippet: truncate(match.value) };
    }
    ranked.push({ entity, tier: match?.tier ?? 1 });
  }
  return ranked;
}

function rankBusinessPartners(
  bps: BusinessPartner[],
  connectionCounts: Map<string, number>,
  term: string,
  searching: boolean,
): Ranked[] {
  const ranked: Ranked[] = [];
  for (const bp of bps) {
    const match = searching ? matchBusinessPartner(bp, term) : null;
    if (searching && !match) continue;
    const entity: VisibleEntity = {
      kind: "business_partner",
      businessPartner: bp,
      connectionCount: connectionCounts.get(bp.id) ?? 0,
    };
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
    const includeInactive = deps.selectionStore.getIncludeInactive();
    const selectedTags = deps.selectionStore.getSelectedTags();
    const term = searchTerm.trim().toLowerCase();
    const searching = term.length > 0;
    const contactConnectionCounts = new Map<string, number>();
    const bpConnectionCounts = new Map<string, number>();
    const companyFallbacks = new Map<string, string>();
    for (const link of selection?.contact_gps ?? []) {
      contactConnectionCounts.set(link.contact_id, (contactConnectionCounts.get(link.contact_id) ?? 0) + 1);
      bpConnectionCounts.set(link.gp_id, (bpConnectionCounts.get(link.gp_id) ?? 0) + 1);
      if (!companyFallbacks.has(link.contact_id)) {
        const bpName = selection?.business_partners.find((bp) => bp.id === link.gp_id)?.data.name.trim();
        if (bpName) companyFallbacks.set(link.contact_id, bpName);
      }
    }

    const visibleContacts = (selection?.contacts ?? []).filter((contact) => includeInactive || contact.active);
    const visibleBps = (selection?.business_partners ?? []).filter((bp) => includeInactive || bp.active);
    const rankedContacts = rankContacts(visibleContacts, contactConnectionCounts, companyFallbacks, term, searching);
    const rankedBps = rankBusinessPartners(visibleBps, bpConnectionCounts, term, searching);

    const taggedRanked = [
      ...(scope !== "gp" ? rankedContacts : []),
      ...(scope !== "contacts" ? rankedBps : []),
    ]
      .filter((ranked) => matchesTags(ranked.entity, selectedTags));

    const entities = taggedRanked
      .sort((a, b) => {
        if (searching && a.tier !== b.tier) return a.tier - b.tier;
        return sortKey(a.entity).localeCompare(sortKey(b.entity), "de");
      })
      .map((r) => r.entity);

    return {
      entities,
      scope,
      searchTerm,
      includeInactive,
      selectedTags,
      counts: {
        contacts: taggedRanked.filter((ranked) => ranked.entity.kind === "contact").length,
        businessPartners: taggedRanked.filter((ranked) => ranked.entity.kind === "business_partner").length,
      },
    };
  };
}
