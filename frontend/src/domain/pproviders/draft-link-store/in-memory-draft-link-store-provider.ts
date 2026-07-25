import type { DraftLinkStoreProvider, LinkEndRef, PendingLink } from "./draft-link-store-provider";

function refersToDraft(ref: LinkEndRef, draftId: string): boolean {
  return ref.type === "draft" && ref.id === draftId;
}

export class InMemoryDraftLinkStoreProvider implements DraftLinkStoreProvider {
  private links: PendingLink[] = [];

  list(): PendingLink[] {
    return structuredClone(this.links);
  }

  add(link: PendingLink): void {
    this.links = [...this.links, structuredClone(link)];
  }

  remove(linkId: string): void {
    this.links = this.links.filter((link) => link.id !== linkId);
  }

  resolveDraft(draftId: string, persistedId: string): void {
    this.links = this.links.map((link) => ({
      ...link,
      contact: refersToDraft(link.contact, draftId) ? { type: "persisted", id: persistedId } : link.contact,
      gp: refersToDraft(link.gp, draftId) ? { type: "persisted", id: persistedId } : link.gp,
    }));
  }

  removeByDraft(draftId: string): void {
    this.links = this.links.filter(
      (link) => !refersToDraft(link.contact, draftId) && !refersToDraft(link.gp, draftId),
    );
  }
}
