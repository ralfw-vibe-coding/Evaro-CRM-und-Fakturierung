import type { SelectionStoreProvider } from "@/domain/pproviders/selection-store/selection-store-provider";

export interface TagOptions {
  channelTypes: string[];
  linkRoles: string[];
  contact: {
    relationship: string[];
    role: string[];
    work_area: string[];
    interests: string[];
    tags: string[];
  };
  businessPartner: {
    types: string[];
    business_relationship: string[];
    tags: string[];
  };
}

function sorted(values: Iterable<string | undefined>): string[] {
  return [...new Set([...values].map((v) => v?.trim()).filter((v): v is string => Boolean(v)))]
    .sort((a, b) => a.localeCompare(b, "de"));
}

function flatten(values: (string[] | undefined)[]): string[] {
  return values.flatMap((value) => value ?? []);
}

export function getTagOptions(deps: { selectionStore: SelectionStoreProvider }) {
  return function process(): TagOptions {
    const selection = deps.selectionStore.get();
    const contacts = selection?.contacts ?? [];
    const bps = selection?.business_partners ?? [];

    return {
      channelTypes: sorted([
        ...contacts.flatMap((contact) => contact.data.channels.map((channel) => channel.type)),
        ...bps.flatMap((bp) => bp.data.channels.map((channel) => channel.type)),
      ]),
      linkRoles: sorted(selection?.contact_gps.map((link) => link.role) ?? []),
      contact: {
        relationship: sorted(flatten(contacts.map((contact) => contact.data.relationship))),
        role: sorted(flatten(contacts.map((contact) => contact.data.role))),
        work_area: sorted(flatten(contacts.map((contact) => contact.data.work_area))),
        interests: sorted(flatten(contacts.map((contact) => contact.data.interests))),
        tags: sorted(flatten(contacts.map((contact) => contact.data.tags))),
      },
      businessPartner: {
        types: sorted(bps.flatMap((bp) => bp.types)),
        business_relationship: sorted(flatten(bps.map((bp) => bp.data.business_relationship))),
        tags: sorted(flatten(bps.map((bp) => bp.data.tags))),
      },
    };
  };
}
