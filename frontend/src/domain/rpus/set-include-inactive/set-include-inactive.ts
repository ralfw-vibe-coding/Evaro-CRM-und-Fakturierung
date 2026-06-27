import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export interface SetIncludeInactiveDeps {
  selectionStore: SelectionStoreProvider;
}

export function setIncludeInactive(deps: SetIncludeInactiveDeps) {
  return function process(includeInactive: boolean): void {
    deps.selectionStore.setIncludeInactive(includeInactive);
  };
}
