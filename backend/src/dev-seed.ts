import type { NewContact } from "./domain/pproviders/contacts/contacts-provider.js";
import type { NewBusinessPartner } from "./domain/pproviders/business-partners/business-partners-provider.js";

/**
 * Sample contacts for local in-memory development, so the CRM overview shows
 * cards before the create flow exists. Only used when PERSISTENCE=memory.
 */
export const DEV_CONTACTS: NewContact[] = [
  {
    active: true,
    data: {
      first_name: "Petra",
      last_name: "Paulsen",
      company_text: "AOK Rheinland",
      channels: [
        { type: "email", address: "petra.paulsen@aok.de" },
        { type: "phone", address: "+49 211 1234567" },
      ],
    },
  },
  {
    active: true,
    data: {
      first_name: "Markus",
      last_name: "Berger",
      company_text: "Berger Consulting",
      channels: [
        { type: "phone", address: "+49 40 7654321" },
        { type: "mobile", address: "+49 170 1112233" },
      ],
    },
  },
  {
    active: true,
    data: {
      first_name: "Sina",
      last_name: "Koch",
      company_text: "Freiberuflerin",
      channels: [{ type: "email", address: "hallo@sina-koch.de" }],
    },
  },
  {
    active: true,
    data: {
      first_name: "Tobias",
      last_name: "Wolf",
      channels: [
        { type: "email", address: "t.wolf@example.com" },
        { type: "phone", address: "+49 89 5550101" },
      ],
    },
  },
];

/** Sample business partners for local in-memory development. */
export const DEV_BUSINESS_PARTNERS: NewBusinessPartner[] = [
  {
    types: ["Kunde"],
    data: {
      name: "AOK Rheinland GmbH & Co. KG",
      vat_id: "DE123456789",
      address: { street: "Kasernenstraße 61", zip: "40213", city: "Düsseldorf", country: "DE" },
      channels: [
        { type: "website", address: "https://aok.de" },
        { type: "email", address: "invoice@aok.de" },
      ],
    },
  },
  {
    types: ["Lieferant"],
    data: {
      name: "Druckerei Meyer e.K.",
      address: { city: "Hamburg", country: "DE" },
      channels: [{ type: "email", address: "auftrag@druckerei-meyer.de" }],
    },
  },
  {
    types: ["Kunde", "Partner"],
    data: {
      name: "Zeitgewinn Hamburg",
      address: { city: "Hamburg", country: "DE" },
      channels: [{ type: "website", address: "https://zeitgewinn-hamburg.de" }],
    },
  },
  {
    types: ["Behörde"],
    data: {
      name: "Finanzamt Hamburg-Mitte",
      address: { city: "Hamburg", country: "DE" },
      channels: [],
    },
  },
];
