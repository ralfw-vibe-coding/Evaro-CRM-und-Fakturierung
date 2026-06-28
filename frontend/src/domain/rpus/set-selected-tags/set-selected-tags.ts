import type {
  SelectedTagFilter,
  SelectionStoreProvider,
} from "@/domain/pproviders/selection-store/selection-store-provider";

export interface SetSelectedTagsDeps {
  selectionStore: SelectionStoreProvider;
}

export function setSelectedTags(deps: SetSelectedTagsDeps) {
  return function process(tags: SelectedTagFilter[]): void {
    const seen = new Set<string>();
    const normalized: SelectedTagFilter[] = [];
    for (const item of tags) {
      const category = item.category.trim();
      const tag = item.tag.trim();
      if (!category || !tag) continue;
      const key = `${category.toLowerCase()}:${tag.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({ category, tag });
    }
    deps.selectionStore.setSelectedTags(normalized);
  };
}
