import { persistContactGpLink, type PersistContactGpLinkDeps } from "@/domain/contact-gp-link";
import type {
  DraftLinkStoreProvider,
  LinkEndRef,
  PendingLink,
} from "@/domain/pproviders/draft-link-store/draft-link-store-provider";

// Re-exported so Portals can use these types without importing a pProvider
// module directly — only RPUs may depend on pProviders.
export type { LinkEndRef, PendingLink };

export interface StageLinkCommand {
  contact: LinkEndRef;
  gp: LinkEndRef;
  draftLabels?: { contact?: string; gp?: string };
}

export type StageLinkResult =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };

/**
 * RPU (Command): declare a contact↔GP reference. If both ends already exist,
 * the link is persisted immediately; otherwise it is staged as a pending link
 * and gets persisted by commit-draft-links once the draft end is saved.
 * Referencing therefore never forces a save of anything.
 */
export function stageLink(deps: PersistContactGpLinkDeps & { draftLinks: DraftLinkStoreProvider }) {
  return async function process(command: StageLinkCommand): Promise<StageLinkResult> {
    if (command.contact.type === "persisted" && command.gp.type === "persisted") {
      const result = await persistContactGpLink(deps, {
        contact_id: command.contact.id,
        gp_id: command.gp.id,
        primary: false,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, persisted: true };
    }
    deps.draftLinks.add({
      id: crypto.randomUUID(),
      contact: command.contact,
      gp: command.gp,
      draftLabels: command.draftLabels,
    });
    return { ok: true, persisted: false };
  };
}
