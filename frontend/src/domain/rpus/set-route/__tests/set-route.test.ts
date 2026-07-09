import { describe, it, expect } from "vitest";
import { setRoute } from "../set-route.js";
import type { RouteStoreProvider } from "@/domain/pproviders/route-store/route-store-provider";

function fakeRouteStore(initialHash: string) {
  const written: string[] = [];
  const provider: RouteStoreProvider = {
    getHash: () => initialHash,
    setHash: (hash) => written.push(hash),
    onChange: () => () => {},
  };
  return { provider, written };
}

describe("setRoute RPU", () => {
  it("writes the formatted hash for a route", () => {
    const { provider, written } = fakeRouteStore("#/crm");
    setRoute({ routeStore: provider })({ area: "crm", entity: { kind: "contact", id: "c1" } });
    expect(written).toEqual(["#/kontakt/c1"]);
  });

  it("skips the write when the current hash already denotes the same route", () => {
    const { provider, written } = fakeRouteStore("#/kontakt/c1");
    setRoute({ routeStore: provider })({ area: "crm", entity: { kind: "contact", id: "c1" } });
    expect(written).toEqual([]);
  });

  it("treats an empty hash as the CRM default route", () => {
    const { provider, written } = fakeRouteStore("");
    setRoute({ routeStore: provider })({ area: "crm", entity: null });
    expect(written).toEqual([]);
  });
});
