import type { DraftLinkStoreProvider } from "@/domain/pproviders/draft-link-store/draft-link-store-provider";

/**
 * RPU (Command): withdraw a staged (not yet persisted) contact↔GP reference.
 */
export function unstageLink(deps: { draftLinks: DraftLinkStoreProvider }) {
  return function process(linkId: string): void {
    deps.draftLinks.remove(linkId);
  };
}
