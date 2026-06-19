import type { Scope, SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

// Re-exported so Portals can use this type without importing a pProvider
// module directly — only RPUs may depend on pProviders.
export type { Scope };

export interface SetScopeDeps {
  selectionStore: SelectionStoreProvider;
}

/** RPU (Command): change the active entity-type scope (the "first filter"). */
export function setScope(deps: SetScopeDeps) {
  return function process(scope: Scope): void {
    deps.selectionStore.setScope(scope);
  };
}
