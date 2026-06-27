import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export interface SetSelectedTagsDeps {
  selectionStore: SelectionStoreProvider;
}

export function setSelectedTags(deps: SetSelectedTagsDeps) {
  return function process(tags: string[]): void {
    deps.selectionStore.setSelectedTags([...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]);
  };
}
