import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export interface SetSearchTermDeps {
  selectionStore: SelectionStoreProvider;
}

/** RPU (Command): change the active full-text search term. */
export function setSearchTerm(deps: SetSearchTermDeps) {
  return function process(term: string): void {
    deps.selectionStore.setSearchTerm(term);
  };
}
