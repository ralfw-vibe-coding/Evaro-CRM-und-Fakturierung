import type {
  EntityRef,
  SelectionStoreProvider,
} from "@/domain/pproviders/selection-store/selection-store-provider";

// Re-exported so Portals can use this type without importing a pProvider
// module directly — only RPUs may depend on pProviders.
export type { EntityRef };

export interface SelectEntityDeps {
  selectionStore: SelectionStoreProvider;
}

/**
 * RPU (Command): mark an entity as selected for the detail view (or clear the
 * selection with `null`). The minimum job of a command RPU — map the request
 * into a state change via the pProvider.
 */
export function selectEntity(deps: SelectEntityDeps) {
  return function process(ref: EntityRef | null): void {
    deps.selectionStore.setSelected(ref);
  };
}
