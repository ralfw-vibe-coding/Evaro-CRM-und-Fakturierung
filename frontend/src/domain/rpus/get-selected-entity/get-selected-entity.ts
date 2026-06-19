import type { BusinessPartner, Contact, ContactGp } from "@/domain/model";
import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export type SelectedEntity =
  | {
      kind: "contact";
      contact: Contact;
      relatedBusinessPartners: { link: ContactGp; businessPartner: BusinessPartner }[];
      availableBusinessPartners: BusinessPartner[];
    }
  | {
      kind: "business_partner";
      businessPartner: BusinessPartner;
      relatedContacts: { link: ContactGp; contact: Contact }[];
      availableContacts: Contact[];
    }
  | null;

export interface GetSelectedEntityDeps {
  selectionStore: SelectionStoreProvider;
}

/**
 * RPU (Query): resolve the stored selection reference into the actual entity.
 * The pProvider only holds a raw `EntityRef` (kind + id) and the raw loaded
 * arrays; this RPU does the lookup/projection — the part a pProvider does not
 * do. Returns null if nothing is selected or the referenced entity is no
 * longer part of the loaded selection (e.g. it was deleted).
 */
export function getSelectedEntity(deps: GetSelectedEntityDeps) {
  return function process(): SelectedEntity {
    const ref = deps.selectionStore.getSelected();
    if (!ref) return null;

    const selection = deps.selectionStore.get();
    if (!selection) return null;

    if (ref.kind === "contact") {
      const contact = selection.contacts.find((c) => c.id === ref.id);
      if (!contact) return null;
      const relatedBusinessPartners = selection.contact_gps
        .filter((link) => link.contact_id === contact.id)
        .map((link) => ({
          link,
          businessPartner: selection.business_partners.find((bp) => bp.id === link.gp_id),
        }))
        .filter(
          (item): item is { link: ContactGp; businessPartner: BusinessPartner } =>
            Boolean(item.businessPartner),
        );
      const linkedIds = new Set(relatedBusinessPartners.map((item) => item.businessPartner.id));
      return {
        kind: "contact",
        contact,
        relatedBusinessPartners,
        availableBusinessPartners: selection.business_partners.filter((bp) => !linkedIds.has(bp.id)),
      };
    }

    const businessPartner = selection.business_partners.find((b) => b.id === ref.id);
    if (!businessPartner) return null;
    const relatedContacts = selection.contact_gps
      .filter((link) => link.gp_id === businessPartner.id)
      .map((link) => ({
        link,
        contact: selection.contacts.find((contact) => contact.id === link.contact_id),
      }))
      .filter((item): item is { link: ContactGp; contact: Contact } => Boolean(item.contact));
    const linkedIds = new Set(relatedContacts.map((item) => item.contact.id));
    return {
      kind: "business_partner",
      businessPartner,
      relatedContacts,
      availableContacts: selection.contacts.filter((contact) => !linkedIds.has(contact.id)),
    };
  };
}
