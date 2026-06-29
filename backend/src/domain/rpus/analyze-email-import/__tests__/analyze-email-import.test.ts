import { describe, expect, it } from "vitest";
import { analyzeEmailImport, type EmailImportProposal } from "../analyze-email-import.js";
import type { BusinessPartner, Contact } from "../../../model.js";

function contact(id: string, data: Partial<Contact["data"]>): Contact {
  return {
    id,
    active: true,
    data: { channels: [], ...data },
    created_at: "",
    updated_at: "",
  };
}

function businessPartner(id: string, data: Partial<BusinessPartner["data"]> & { name: string }): BusinessPartner {
  return {
    id,
    active: true,
    types: [],
    data: { channels: [], ...data },
    created_at: "",
    updated_at: "",
  };
}

function processWith(proposal: EmailImportProposal, contacts: Contact[], business_partners: BusinessPartner[]) {
  return analyzeEmailImport({
    loadSelection: async () => ({ contacts, business_partners, contact_gps: [] }),
    extract: async () => proposal,
  })({ email_text: "Dies ist ein ausreichend langer E-Mail-Text fuer die Analyse.", today: "29.06.2026" });
}

describe("analyzeEmailImport RPU", () => {
  it("matches contacts by last name and email, not by shared email alone", async () => {
    const proposal: EmailImportProposal = {
      contact: {
        first_name: "Petra",
        last_name: "Paulsen",
        channels: [{ type: "email", address: "info@example.de" }],
      },
      business_partner: { name: "Example GmbH", channels: [] },
    };

    const result = await processWith(
      proposal,
      [
        contact("same-last-name", {
          first_name: "Pia",
          last_name: "Paulsen",
          channels: [{ type: "email", address: "INFO@example.de" }],
        }),
        contact("different-last-name", {
          first_name: "Ralf",
          last_name: "Westphal",
          channels: [{ type: "email", address: "info@example.de" }],
        }),
      ],
      [],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.matches.contacts.map((match) => match.entity.id)).toEqual(["same-last-name"]);
    expect(result.analysis.matches.contacts[0].score).toBe(100);
  });

  it("matches contacts by last name and normalized phone", async () => {
    const proposal: EmailImportProposal = {
      contact: {
        last_name: "Paulsen",
        channels: [{ type: "mobile", address: "+49 170 123-456" }],
      },
      business_partner: { name: "Example GmbH", channels: [] },
    };

    const result = await processWith(
      proposal,
      [
        contact("phone-match", {
          last_name: "Paulsen",
          channels: [{ type: "phone", address: "0049 (170) 123456" }],
        }),
      ],
      [],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.matches.contacts[0].entity.id).toBe("phone-match");
    expect(result.analysis.matches.contacts[0].score).toBe(95);
  });

  it("scores and sorts business partner matches by normalized company-name similarity", async () => {
    const proposal: EmailImportProposal = {
      contact: { last_name: "Paulsen", channels: [{ type: "email", address: "p@example.de" }] },
      business_partner: { name: "Muster GmbH", address: { city: "Hamburg" }, channels: [] },
    };

    const result = await processWith(
      proposal,
      [],
      [
        businessPartner("exact", { name: "Muster Gesellschaft mbH", channels: [] }),
        businessPartner("similar-city", { name: "Muster Beratung GmbH", address: { city: "Hamburg" }, channels: [] }),
        businessPartner("different", { name: "AOK Rheinland", channels: [] }),
      ],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.matches.business_partners.map((match) => match.entity.id)).toEqual([
      "exact",
      "similar-city",
    ]);
    expect(result.analysis.matches.business_partners[0].score).toBeGreaterThan(
      result.analysis.matches.business_partners[1].score,
    );
  });
});
