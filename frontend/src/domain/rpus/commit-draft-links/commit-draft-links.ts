import { persistContactGpLink, type PersistContactGpLinkDeps } from "@/domain/contact-gp-link";
import type { DraftLinkStoreProvider } from "@/domain/pproviders/draft-link-store/draft-link-store-provider";

export interface CommitDraftLinksCommand {
  draftId: string;
  persistedId: string;
}

export type CommitDraftLinksResult = { ok: true } | { ok: false; error: string };

/**
 * RPU (Command): a draft was saved and now has a real id. Resolve every
 * pending link that referenced the draft, then persist all links whose both
 * ends now exist. Links whose other end is still a draft stay pending until
 * that draft is saved in turn.
 */
export function commitDraftLinks(
  deps: PersistContactGpLinkDeps & { draftLinks: DraftLinkStoreProvider },
) {
  return async function process(command: CommitDraftLinksCommand): Promise<CommitDraftLinksResult> {
    deps.draftLinks.resolveDraft(command.draftId, command.persistedId);
    const ready = deps.draftLinks
      .list()
      .filter((link) => link.contact.type === "persisted" && link.gp.type === "persisted");
    for (const link of ready) {
      const result = await persistContactGpLink(deps, {
        contact_id: link.contact.id,
        gp_id: link.gp.id,
        primary: false,
      });
      if (!result.ok) return { ok: false, error: result.error };
      deps.draftLinks.remove(link.id);
    }
    return { ok: true };
  };
}
