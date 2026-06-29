import { describe, it, expect, beforeEach } from "vitest";
import { updateContact } from "../update-contact.js";
import { InMemoryContactsProvider } from "../../../pproviders/contacts/in-memory-contacts-provider.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";

function setup() {
  const contacts = new InMemoryContactsProvider();
  const activityLog = new InMemoryActivityLogProvider();
  return { contacts, activityLog, process: updateContact({ contacts, activityLog }) };
}

async function seedContact(contacts: InMemoryContactsProvider) {
  return contacts.insert({
    active: true,
    data: { first_name: "Petra", last_name: "Paulsen", channels: [{ type: "email", address: "p@aok.de" }] },
  });
}

describe("updateContact RPU", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("overwrites the contact's data and logs contact_updated", async () => {
    const existing = await seedContact(env.contacts);

    const result = await env.process({
      user_id: USER,
      id: existing.id,
      data: { first_name: "Petra", last_name: "Müller", channels: [{ type: "email", address: "p@aok.de" }] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.data.last_name).toBe("Müller");
    expect(result.conflict).toBe(false);

    const log = await env.activityLog.listForEntity("contact", existing.id);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("contact_updated");
  });

  it("rejects an unknown contact id", async () => {
    const result = await env.process({
      user_id: USER,
      id: "does-not-exist",
      data: { last_name: "X", channels: [{ type: "email", address: "x@y.de" }] },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects removing all email and phone channels", async () => {
    const existing = await seedContact(env.contacts);
    const result = await env.process({
      user_id: USER,
      id: existing.id,
      data: { first_name: "Petra", last_name: "Paulsen", channels: [] },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.channels).toBeTruthy();
  });

  it("flags a conflict when expected_updated_at no longer matches, but still writes", async () => {
    const existing = await seedContact(env.contacts);

    const result = await env.process({
      user_id: USER,
      id: existing.id,
      expected_updated_at: "2000-01-01T00:00:00.000Z",
      data: { first_name: "Petra", last_name: "Neu", channels: [{ type: "email", address: "p@aok.de" }] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.conflict).toBe(true);
    expect(result.contact.data.last_name).toBe("Neu");
  });

  it("does not flag a conflict when expected_updated_at matches", async () => {
    const existing = await seedContact(env.contacts);

    const result = await env.process({
      user_id: USER,
      id: existing.id,
      expected_updated_at: existing.updated_at,
      data: { first_name: "Petra", last_name: "Paulsen", channels: [{ type: "email", address: "p@aok.de" }] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.conflict).toBe(false);
  });

  it("can change active", async () => {
    const existing = await seedContact(env.contacts);
    const result = await env.process({
      user_id: USER,
      id: existing.id,
      active: false,
      data: { first_name: "Petra", last_name: "Paulsen", channels: [{ type: "email", address: "p@aok.de" }] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.active).toBe(false);
  });
});
