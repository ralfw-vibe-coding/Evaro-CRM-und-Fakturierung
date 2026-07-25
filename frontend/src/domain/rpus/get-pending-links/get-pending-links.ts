import type {
  DraftLinkStoreProvider,
  LinkEndRef,
} from "@/domain/pproviders/draft-link-store/draft-link-store-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export type { LinkEndRef };

export type EntityKind = "contact" | "business_partner";

export interface PendingLinkView {
  linkId: string;
  otherKind: EntityKind;
  otherRef: LinkEndRef;
  label: string;
}

function sameRef(a: LinkEndRef, b: LinkEndRef): boolean {
  return a.type === b.type && a.id === b.id;
}

/**
 * RPU (Query): project the staged links of one entity (draft or persisted)
 * into display rows — the "other" end resolved to a label via the loaded
 * selection, or via the label snapshot for ends that are still drafts.
 */
export function getPendingLinks(deps: {
  draftLinks: DraftLinkStoreProvider;
  selectionStore: SelectionStoreProvider;
}) {
  return function process(selfKind: EntityKind, selfRef: LinkEndRef): PendingLinkView[] {
    const selection = deps.selectionStore.get();
    return deps.draftLinks
      .list()
      .filter((link) => sameRef(selfKind === "contact" ? link.contact : link.gp, selfRef))
      .map((link) => {
        const otherKind: EntityKind = selfKind === "contact" ? "business_partner" : "contact";
        const otherRef = otherKind === "contact" ? link.contact : link.gp;
        let label: string | undefined;
        if (otherRef.type === "persisted") {
          label =
            otherKind === "contact"
              ? (() => {
                  const contact = selection?.contacts.find((item) => item.id === otherRef.id);
                  return contact
                    ? [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ")
                    : undefined;
                })()
              : selection?.business_partners.find((item) => item.id === otherRef.id)?.data.name;
        } else {
          label = otherKind === "contact" ? link.draftLabels?.contact : link.draftLabels?.gp;
        }
        return {
          linkId: link.id,
          otherKind,
          otherRef,
          label: label?.trim() || "Neuer Eintrag",
        };
      });
  };
}
