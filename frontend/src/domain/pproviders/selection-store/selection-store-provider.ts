import type { Selection } from "@/domain/model";

export type Scope = "both" | "contacts" | "gp";

/** A raw reference to a selected entity — just an id, no looked-up data. */
export type EntityRef =
  | { kind: "contact"; id: string }
  | { kind: "business_partner"; id: string };

/**
 * pProvider: holds the frontend's own materialized copy of the loaded
 * selection plus client-local view state (active scope, search term, the
 * selected entity reference). This is the frontend's domain state — a local
 * replica, not owned by the backend. Its persistence medium is plain memory,
 * just as the backend uses an in-memory pProvider when no database is
 * configured. It holds the raw `EntityRef`, not the resolved entity —
 * resolving it is the RPU's job, not this pProvider's.
 */
export interface SelectionStoreProvider {
  get(): Selection | null;
  set(selection: Selection): void;
  getScope(): Scope;
  setScope(scope: Scope): void;
  getSearchTerm(): string;
  setSearchTerm(term: string): void;
  getIncludeInactive(): boolean;
  setIncludeInactive(includeInactive: boolean): void;
  getSelectedTags(): string[];
  setSelectedTags(tags: string[]): void;
  getSelected(): EntityRef | null;
  setSelected(ref: EntityRef | null): void;
}
