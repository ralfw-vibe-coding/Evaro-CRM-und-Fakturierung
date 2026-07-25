import type { DraftLinkStoreProvider } from "@/domain/pproviders/draft-link-store/draft-link-store-provider";

/**
 * RPU (Command): a draft editor was closed without saving — drop every
 * pending link that referenced the draft. Discarded means discarded: no
 * entity, no relation.
 */
export function discardDraft(deps: { draftLinks: DraftLinkStoreProvider }) {
  return function process(draftId: string): void {
    deps.draftLinks.removeByDraft(draftId);
  };
}
