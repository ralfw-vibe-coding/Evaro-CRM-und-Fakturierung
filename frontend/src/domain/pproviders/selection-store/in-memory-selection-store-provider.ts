import type { Selection } from "@/domain/model";
import type { EntityRef, Scope, SelectionStoreProvider } from "./selection-store-provider";

/**
 * Clones in and out on every access, just like the backend's in-memory
 * pProviders. This guarantees no caller — RPU, and through it eventually a
 * Portal/DOM structure — ever holds a reference to the actual internal state
 * object. What happens to a returned object afterwards (e.g. in a React
 * component) can therefore never reach back into domain state; only an RPU
 * calling `set`/`setSelected`/etc. can change it.
 */
export class InMemorySelectionStoreProvider implements SelectionStoreProvider {
  private selection: Selection | null = null;
  private scope: Scope = "both";
  private searchTerm = "";
  private includeInactive = false;
  private selectedTags: string[] = [];
  private selected: EntityRef | null = null;

  get(): Selection | null {
    return this.selection ? structuredClone(this.selection) : null;
  }

  set(selection: Selection): void {
    this.selection = structuredClone(selection);
  }

  getScope(): Scope {
    return this.scope;
  }

  setScope(scope: Scope): void {
    this.scope = scope;
  }

  getSearchTerm(): string {
    return this.searchTerm;
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
  }

  getIncludeInactive(): boolean {
    return this.includeInactive;
  }

  setIncludeInactive(includeInactive: boolean): void {
    this.includeInactive = includeInactive;
  }

  getSelectedTags(): string[] {
    return structuredClone(this.selectedTags);
  }

  setSelectedTags(tags: string[]): void {
    this.selectedTags = structuredClone(tags);
  }

  getSelected(): EntityRef | null {
    return this.selected ? structuredClone(this.selected) : null;
  }

  setSelected(ref: EntityRef | null): void {
    this.selected = ref ? structuredClone(ref) : null;
  }
}
