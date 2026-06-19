import { describe, it, expect } from "vitest";
import { listActiveContacts } from "../list-active-contacts.js";
import { InMemoryContactsProvider } from "../../../pproviders/contacts/in-memory-contacts-provider.js";

function emptyChannelsData(first: string) {
  return { first_name: first, channels: [] };
}

describe("listActiveContacts RPU", () => {
  it("returns active contacts and omits passive ones", async () => {
    const contacts = new InMemoryContactsProvider();
    await contacts.insert({ active: true, data: emptyChannelsData("Petra") });
    await contacts.insert({ active: false, data: emptyChannelsData("Passiv") });
    const process = listActiveContacts({ contacts });

    const result = await process();

    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].data.first_name).toBe("Petra");
  });

  it("returns an empty list when there are no contacts", async () => {
    const process = listActiveContacts({ contacts: new InMemoryContactsProvider() });
    const result = await process();
    expect(result.contacts).toEqual([]);
  });
});
