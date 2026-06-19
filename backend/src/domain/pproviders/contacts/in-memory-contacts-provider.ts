import { randomUUID } from "node:crypto";
import type { Contact } from "../../model.js";
import type { ContactsProvider, ContactUpdate, NewContact } from "./contacts-provider.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";

/**
 * Lightweight in-memory implementation for local development and for testing
 * RPUs without a database (see tech-stack.md). An optional seed lets local dev
 * start with sample data.
 */
export class InMemoryContactsProvider implements ContactsProvider {
  private readonly contacts = new Map<string, Contact>();

  constructor(seed: NewContact[] = []) {
    const existing = devStatePath() ? readDevState().contacts : undefined;
    if (existing) {
      for (const contact of existing) this.contacts.set(contact.id, contact);
      return;
    }
    for (const input of seed) this.store(input);
    this.persist();
  }

  private hydrate(): void {
    const existing = devStatePath() ? readDevState().contacts : undefined;
    if (!existing) return;
    this.contacts.clear();
    for (const contact of existing) this.contacts.set(contact.id, contact);
  }

  private persist(): void {
    writeDevState({ contacts: [...this.contacts.values()] });
  }

  private store(input: NewContact): Contact {
    const now = new Date().toISOString();
    const contact: Contact = {
      id: randomUUID(),
      active: input.active,
      data: structuredClone(input.data),
      created_at: now,
      updated_at: now,
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  async insert(input: NewContact): Promise<Contact> {
    this.hydrate();
    const contact = this.store(input);
    this.persist();
    return structuredClone(contact);
  }

  async listActive(): Promise<Contact[]> {
    this.hydrate();
    return [...this.contacts.values()]
      .filter((c) => c.active)
      .map((c) => structuredClone(c));
  }

  async findById(id: string): Promise<Contact | null> {
    this.hydrate();
    const contact = this.contacts.get(id);
    return contact ? structuredClone(contact) : null;
  }

  async update(id: string, update: ContactUpdate): Promise<Contact | null> {
    this.hydrate();
    const existing = this.contacts.get(id);
    if (!existing) return null;

    const updated: Contact = {
      ...existing,
      active: update.active ?? existing.active,
      data: structuredClone(update.data),
      updated_at: new Date().toISOString(),
    };
    this.contacts.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }
}
