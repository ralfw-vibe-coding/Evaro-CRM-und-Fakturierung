/**
 * pProvider: holds the app's current route as a raw URL hash string. The
 * persistence medium is the browser's location hash — it survives reloads,
 * is bookmarkable/shareable (permalinks), and feeds the history (back/
 * forward). This pProvider only stores/reports the raw hash; parsing it
 * into a meaningful route is the RPUs' job.
 */
export interface RouteStoreProvider {
  getHash(): string;
  setHash(hash: string): void;
  /** Subscribe to hash changes (e.g. back/forward). Returns an unsubscribe. */
  onChange(listener: () => void): () => void;
}
