import type { RouteStoreProvider } from "./route-store-provider";

export const browserRouteStoreProvider: RouteStoreProvider = {
  getHash() {
    return window.location.hash;
  },

  setHash(hash: string) {
    window.location.hash = hash;
  },

  onChange(listener: () => void) {
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  },
};
