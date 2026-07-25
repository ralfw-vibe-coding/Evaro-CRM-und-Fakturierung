import { describe, it, expect } from "vitest";
import { stageLink } from "../stage-link.js";
import { commitDraftLinks } from "../../commit-draft-links/commit-draft-links.js";
import { discardDraft } from "../../discard-draft/discard-draft.js";
import { getPendingLinks } from "../../get-pending-links/get-pending-links.js";
import { InMemoryDraftLinkStoreProvider } from "@/domain/pproviders/draft-link-store/in-memory-draft-link-store-provider";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";
import type { ContactGp, Selection } from "@/domain/model";
import type { LinkContactGpCommand } from "@/domain/contact-gp-link";

function fakeSession(): SessionProvider {
  return {
    get: () => ({ token: "t", user: { id: "u1", email: "a@b.c", abbr: "AB" } }),
    save: () => {},
    clear: () => {},
  };
}

function fakeBackend(linkCalls: Array<{ contact_id: string; gp_id: string }>): BackendApiProvider {
  return {
    linkContactGp: async (_token: string, command: LinkContactGpCommand) => {
      linkCalls.push({ contact_id: command.contact_id, gp_id: command.gp_id });
      return {
        ok: true,
        value: {
          link: {
            contact_id: command.contact_id,
            gp_id: command.gp_id,
            primary: false,
          } as ContactGp,
        },
      };
    },
  } as unknown as BackendApiProvider;
}

function fakeSelectionStore(selection: Selection | null = null): SelectionStoreProvider {
  let current = selection;
  return {
    get: () => (current ? structuredClone(current) : null),
    set: (next: Selection) => {
      current = structuredClone(next);
    },
  } as unknown as SelectionStoreProvider;
}

function makeDeps() {
  const linkCalls: Array<{ contact_id: string; gp_id: string }> = [];
  const draftLinks = new InMemoryDraftLinkStoreProvider();
  const deps = {
    draftLinks,
    backendApi: fakeBackend(linkCalls),
    session: fakeSession(),
    selectionStore: fakeSelectionStore(),
  };
  return { deps, draftLinks, linkCalls };
}

describe("stage-link RPU", () => {
  it("persists immediately when both ends are persisted", async () => {
    const { deps, draftLinks, linkCalls } = makeDeps();
    const result = await stageLink(deps)({
      contact: { type: "persisted", id: "c1" },
      gp: { type: "persisted", id: "g1" },
    });
    expect(result).toEqual({ ok: true, persisted: true });
    expect(linkCalls).toEqual([{ contact_id: "c1", gp_id: "g1" }]);
    expect(draftLinks.list()).toEqual([]);
  });

  it("stages a pending link when one end is a draft", async () => {
    const { deps, draftLinks, linkCalls } = makeDeps();
    const result = await stageLink(deps)({
      contact: { type: "draft", id: "d1" },
      gp: { type: "persisted", id: "g1" },
    });
    expect(result).toEqual({ ok: true, persisted: false });
    expect(linkCalls).toEqual([]);
    expect(draftLinks.list()).toHaveLength(1);
  });
});

describe("commit-draft-links RPU", () => {
  it("resolves the draft and persists links whose both ends now exist", async () => {
    const { deps, draftLinks, linkCalls } = makeDeps();
    await stageLink(deps)({
      contact: { type: "draft", id: "d1" },
      gp: { type: "persisted", id: "g1" },
    });
    const result = await commitDraftLinks(deps)({ draftId: "d1", persistedId: "c9" });
    expect(result).toEqual({ ok: true });
    expect(linkCalls).toEqual([{ contact_id: "c9", gp_id: "g1" }]);
    expect(draftLinks.list()).toEqual([]);
  });

  it("keeps links pending whose other end is still a draft", async () => {
    const { deps, draftLinks, linkCalls } = makeDeps();
    // GP-Entwurf referenziert Kontakt-Entwurf; nur der Kontakt wird gespeichert.
    await stageLink(deps)({
      contact: { type: "draft", id: "dc" },
      gp: { type: "draft", id: "dg" },
    });
    const result = await commitDraftLinks(deps)({ draftId: "dc", persistedId: "c1" });
    expect(result).toEqual({ ok: true });
    expect(linkCalls).toEqual([]);
    const remaining = draftLinks.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].contact).toEqual({ type: "persisted", id: "c1" });
    expect(remaining[0].gp).toEqual({ type: "draft", id: "dg" });

    // Später wird auch der GP gespeichert → Verknüpfung wird eingelöst.
    const second = await commitDraftLinks(deps)({ draftId: "dg", persistedId: "g1" });
    expect(second).toEqual({ ok: true });
    expect(linkCalls).toEqual([{ contact_id: "c1", gp_id: "g1" }]);
    expect(draftLinks.list()).toEqual([]);
  });
});

describe("discard-draft RPU", () => {
  it("drops every pending link that referenced the draft", async () => {
    const { deps, draftLinks } = makeDeps();
    await stageLink(deps)({
      contact: { type: "draft", id: "d1" },
      gp: { type: "persisted", id: "g1" },
    });
    await stageLink(deps)({
      contact: { type: "persisted", id: "c1" },
      gp: { type: "draft", id: "d2" },
    });
    discardDraft(deps)("d1");
    const remaining = draftLinks.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].gp).toEqual({ type: "draft", id: "d2" });
  });
});

describe("get-pending-links RPU", () => {
  it("projects links of one entity with labels from selection or draft snapshot", async () => {
    const { deps } = makeDeps();
    deps.selectionStore.set({
      contacts: [],
      business_partners: [
        { id: "g1", data: { name: "AOK Rheinland", channels: [] }, types: [] },
      ],
      contact_gps: [],
    } as unknown as Selection);
    await stageLink(deps)({
      contact: { type: "draft", id: "d1" },
      gp: { type: "persisted", id: "g1" },
    });
    await stageLink(deps)({
      contact: { type: "draft", id: "d1" },
      gp: { type: "draft", id: "d2" },
      draftLabels: { gp: "Neue Firma GmbH" },
    });

    const views = getPendingLinks(deps)("contact", { type: "draft", id: "d1" });
    expect(views).toHaveLength(2);
    expect(views[0].otherKind).toBe("business_partner");
    expect(views[0].label).toBe("AOK Rheinland");
    expect(views[1].label).toBe("Neue Firma GmbH");

    // Aus GP-Sicht ist derselbe erste Link ebenfalls sichtbar.
    const gpViews = getPendingLinks(deps)("business_partner", { type: "persisted", id: "g1" });
    expect(gpViews).toHaveLength(1);
    expect(gpViews[0].otherKind).toBe("contact");
  });
});
