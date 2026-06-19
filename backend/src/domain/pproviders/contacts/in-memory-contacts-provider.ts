import { randomUUID } from "node:crypto";
import type { Contact } from "../../model.js";
import type { ContactsProvider, NewContact } from "./contacts-provider.js";

/**
 * Lightweight in-memory implementation for local development and for testing
 * RPUs without a database (see tech-stack.md).
 */
export class InMemoryContactsProvider implements ContactsProvider {
  private readonly contacts = new Map<string, Contact>();

  async insert(input: NewContact): Promise<Contact> {
    const now = new Date().toISOString();
    const contact: Contact = {
      id: randomUUID(),
      active: input.active,
      data: structuredClone(input.data),
      created_at: now,
      updated_at: now,
    };
    this.contacts.set(contact.id, contact);
    return structuredClone(contact);
  }

  async listActive(): Promise<Contact[]> {
    return [...this.contacts.values()]
      .filter((c) => c.active)
      .map((c) => structuredClone(c));
  }
}
