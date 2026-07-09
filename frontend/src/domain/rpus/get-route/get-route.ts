import type { EntityRef } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { RouteStoreProvider } from "@/domain/pproviders/route-store/route-store-provider";

// Re-exported so Portals can use this type without importing a pProvider
// module directly — only RPUs may depend on pProviders.
export type { EntityRef };

/**
 * The app's navigable state as reflected in the URL (permalinks):
 *  - #/crm             CRM area, nothing selected
 *  - #/kontakt/<id>    CRM area, contact detail open
 *  - #/gp/<id>         CRM area, business-partner detail open
 *  - #/rechnungen      invoicing area, nothing selected
 *  - #/rechnung/<id>   invoicing area, invoice selected
 */
export type Route =
  | { area: "crm"; entity: EntityRef | null }
  | { area: "invoicing"; invoiceId: string | null };

/** Parse a raw location hash into a Route. Unknown/empty hashes fall back to the CRM area. */
export function parseRoute(hash: string): Route {
  const [head, rawId] = hash.replace(/^#\/?/, "").split("/");
  const id = rawId ? decodeURIComponent(rawId) : null;
  if (head === "kontakt" && id) return { area: "crm", entity: { kind: "contact", id } };
  if (head === "gp" && id) return { area: "crm", entity: { kind: "business_partner", id } };
  if (head === "rechnung" && id) return { area: "invoicing", invoiceId: id };
  if (head === "rechnungen") return { area: "invoicing", invoiceId: null };
  return { area: "crm", entity: null };
}

/** Format a Route as a location hash — the inverse of parseRoute. */
export function formatRoute(route: Route): string {
  if (route.area === "invoicing") {
    return route.invoiceId ? `#/rechnung/${encodeURIComponent(route.invoiceId)}` : "#/rechnungen";
  }
  if (!route.entity) return "#/crm";
  const segment = route.entity.kind === "contact" ? "kontakt" : "gp";
  return `#/${segment}/${encodeURIComponent(route.entity.id)}`;
}

export interface GetRouteDeps {
  routeStore: RouteStoreProvider;
}

/**
 * RPU (Query): project the raw hash held by the route-store pProvider into
 * the current Route — the parse step is the projection a pProvider doesn't do.
 */
export function getRoute(deps: GetRouteDeps) {
  return function process(): Route {
    return parseRoute(deps.routeStore.getHash());
  };
}
