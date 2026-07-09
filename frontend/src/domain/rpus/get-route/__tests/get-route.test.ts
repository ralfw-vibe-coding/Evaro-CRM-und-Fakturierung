import { describe, it, expect } from "vitest";
import { formatRoute, getRoute, parseRoute, type Route } from "../get-route.js";
import type { RouteStoreProvider } from "@/domain/pproviders/route-store/route-store-provider";

function fakeRouteStore(hash: string): RouteStoreProvider {
  return {
    getHash: () => hash,
    setHash: () => {},
    onChange: () => () => {},
  };
}

describe("parseRoute", () => {
  it("parses entity and invoice permalinks", () => {
    expect(parseRoute("#/kontakt/c1")).toEqual({ area: "crm", entity: { kind: "contact", id: "c1" } });
    expect(parseRoute("#/gp/bp1")).toEqual({ area: "crm", entity: { kind: "business_partner", id: "bp1" } });
    expect(parseRoute("#/rechnung/i1")).toEqual({ area: "invoicing", invoiceId: "i1" });
  });

  it("parses area-only routes", () => {
    expect(parseRoute("#/crm")).toEqual({ area: "crm", entity: null });
    expect(parseRoute("#/rechnungen")).toEqual({ area: "invoicing", invoiceId: null });
  });

  it("falls back to the CRM area for empty or unknown hashes", () => {
    expect(parseRoute("")).toEqual({ area: "crm", entity: null });
    expect(parseRoute("#/unbekannt/xyz")).toEqual({ area: "crm", entity: null });
    expect(parseRoute("#/kontakt")).toEqual({ area: "crm", entity: null });
  });

  it("decodes ids that were URL-encoded", () => {
    expect(parseRoute("#/kontakt/a%2Fb")).toEqual({ area: "crm", entity: { kind: "contact", id: "a/b" } });
  });
});

describe("formatRoute", () => {
  it("is the inverse of parseRoute", () => {
    const routes: Route[] = [
      { area: "crm", entity: null },
      { area: "crm", entity: { kind: "contact", id: "c1" } },
      { area: "crm", entity: { kind: "business_partner", id: "bp1" } },
      { area: "invoicing", invoiceId: null },
      { area: "invoicing", invoiceId: "i1" },
    ];
    for (const route of routes) {
      expect(parseRoute(formatRoute(route))).toEqual(route);
    }
  });

  it("URL-encodes ids", () => {
    expect(formatRoute({ area: "crm", entity: { kind: "contact", id: "a/b" } })).toBe("#/kontakt/a%2Fb");
  });
});

describe("getRoute RPU", () => {
  it("projects the raw hash held by the pProvider into a Route", () => {
    expect(getRoute({ routeStore: fakeRouteStore("#/rechnung/i7") })()).toEqual({
      area: "invoicing",
      invoiceId: "i7",
    });
  });
});
