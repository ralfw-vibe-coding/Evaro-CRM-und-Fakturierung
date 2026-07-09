import type { RouteStoreProvider } from "@/domain/pproviders/route-store/route-store-provider";
import { formatRoute, parseRoute, type Route } from "../get-route/get-route.js";

export type { Route };

export interface SetRouteDeps {
  routeStore: RouteStoreProvider;
}

/**
 * RPU (Command): map a Route into the raw hash held by the route-store
 * pProvider. Skips the write when the current hash already denotes the same
 * route, so no redundant history entries (and no change events) are produced.
 */
export function setRoute(deps: SetRouteDeps) {
  return function process(route: Route): void {
    const next = formatRoute(route);
    if (formatRoute(parseRoute(deps.routeStore.getHash())) === next) return;
    deps.routeStore.setHash(next);
  };
}
