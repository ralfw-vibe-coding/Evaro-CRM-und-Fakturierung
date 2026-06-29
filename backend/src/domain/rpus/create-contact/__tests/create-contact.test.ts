import { describe, it, expect, beforeEach } from "vitest";
import { createContact, type CreateContactCommand } from "../create-contact.js";
import { InMemoryContactsProvider } from "../../../pproviders/contacts/in-memory-contacts-provider.js";
import { InMemoryActivityLogProvider } from "../../../pproviders/activity-log/in-memory-activity-log-provider.js";

const USER = "11111111-1111-1111-1111-111111111111";

function setup() {
  const contacts = new InMemoryContactsProvider();
  const activityLog = new InMemoryActivityLogProvider();
  const process = createContact({ contacts, activityLog });
  return { contacts, activityLog, process };
}

function validCommand(overrides: Partial<CreateContactCommand> = {}): CreateContactCommand {
  return {
    user_id: USER,
    data: {
      first_name: "Petra",
      last_name: "Paulsen",
      channels: [{ type: "email", address: "petra@aok.de" }],
    },
    ...overrides,
  };
}

describe("createContact RPU", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("creates a contact and returns the stored record", async () => {
    const result = await env.process(validCommand());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.id).toBeTruthy();
    expect(result.contact.active).toBe(true);
    expect(result.contact.data.first_name).toBe("Petra");
    expect(result.contact.data.channels).toEqual([
      { type: "email", address: "petra@aok.de" },
    ]);

    const stored = await env.contacts.listActive();
    expect(stored).toHaveLength(1);
  });

  it("writes a contact_created activity log entry for the new contact", async () => {
    const result = await env.process(validCommand());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const log = await env.activityLog.listForEntity("contact", result.contact.id);
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("contact_created");
    expect(log[0].user_id).toBe(USER);
    expect(log[0].entity_type).toBe("contact");
  });

  it("defaults active to true but honors an explicit false", async () => {
    const result = await env.process(validCommand({ active: false }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.active).toBe(false);
  });

  it("rejects a contact without a last name", async () => {
    const result = await env.process(
      validCommand({ data: { first_name: "Petra", channels: [{ type: "email", address: "x@y.de" }] } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.last_name).toBeTruthy();
  });

  it("rejects a contact without email or phone channel", async () => {
    const result = await env.process(
      validCommand({ data: { last_name: "Paulsen", channels: [] } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.channels).toBeTruthy();
  });

  it("rejects when no user is authenticated", async () => {
    const result = await env.process(validCommand({ user_id: "" }));
    expect(result.ok).toBe(false);
  });

  it("supports multiple channels of the same type", async () => {
    const result = await env.process(
      validCommand({
        data: {
          first_name: "Petra",
          last_name: "Paulsen",
          channels: [
            { type: "phone", address: "+49 1" },
            { type: "phone", address: "+49 2" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.data.channels).toHaveLength(2);
  });

  it("trims whitespace and drops empty channels and tags", async () => {
    const result = await env.process(
      validCommand({
        data: {
          first_name: "  Petra  ",
          last_name: "  Paulsen ",
          channels: [
            { type: "email", address: " petra@aok.de " },
            { type: "phone", address: "  " },
          ],
          tags: ["vip", "  ", ""],
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.data.first_name).toBe("Petra");
    expect(result.contact.data.channels).toEqual([
      { type: "email", address: "petra@aok.de" },
    ]);
    expect(result.contact.data.tags).toEqual(["vip"]);
  });

  it("rejects an invalid gender enum", async () => {
    const result = await env.process(
      validCommand({
        data: {
          first_name: "Petra",
          last_name: "Paulsen",
          gender: "x",
          channels: [{ type: "email", address: "petra@aok.de" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.gender).toBeTruthy();
  });
});
