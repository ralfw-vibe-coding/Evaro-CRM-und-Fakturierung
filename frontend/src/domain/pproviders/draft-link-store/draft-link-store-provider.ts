/** One end of a contact↔GP reference: an already persisted entity or a draft
 * that only exists as an open editor (identified by its client-side draft id). */
export type LinkEndRef = { type: "persisted"; id: string } | { type: "draft"; id: string };

export interface PendingLink {
  id: string;
  contact: LinkEndRef;
  gp: LinkEndRef;
  /** Display snapshot for draft ends, taken when the link was staged. */
  draftLabels?: { contact?: string; gp?: string };
}

/**
 * pProvider: holds staged contact↔GP references ("pending links") whose ends
 * may still be unsaved drafts. This is the frontend's own domain state — the
 * declared intent to link two entries as soon as both exist. Persistence
 * medium is plain memory; a pending link either gets committed (both ends
 * saved) or discarded together with its draft.
 */
export interface DraftLinkStoreProvider {
  list(): PendingLink[];
  add(link: PendingLink): void;
  remove(linkId: string): void;
  /** Rewrite every reference to the given draft into a persisted reference. */
  resolveDraft(draftId: string, persistedId: string): void;
  /** Drop all pending links that reference the given draft. */
  removeByDraft(draftId: string): void;
}
