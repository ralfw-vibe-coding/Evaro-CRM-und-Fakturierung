import type { RouteStoreProvider } from "@/domain/pproviders/route-store/route-store-provider";
import { parseRoute, type Route } from "../get-route/get-route.js";

export type { Route };

export interface WatchRouteDeps {
  routeStore: RouteStoreProvider;
}

/**
 * RPU (Query, continuous): report every route change (back/forward, manual
 * URL edits) as a parsed Route. Returns an unsubscribe function.
 */
export function watchRoute(deps: WatchRouteDeps) {
  return function process(onChange: (route: Route) => void): () => void {
    return deps.routeStore.onChange(() => onChange(parseRoute(deps.routeStore.getHash())));
  };
}
