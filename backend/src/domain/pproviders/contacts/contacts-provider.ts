import type { Contact, ContactData } from "../../model.js";

export interface NewContact {
  active: boolean;
  data: ContactData;
}

export interface ContactUpdate {
  active?: boolean;
  data: ContactData;
}

/**
 * Persistence abstraction for contacts. Implementations encapsulate the
 * storage technology (Postgres, in-memory). Only RPUs depend on this.
 */
export interface ContactsProvider {
  /** Insert a new contact and return the stored record (with generated id/timestamps). */
  insert(input: NewContact): Promise<Contact>;

  /** All active contacts, used for the initial selection and tests. */
  listActive(): Promise<Contact[]>;

  /** A single contact by id, or null if it doesn't exist. */
  findById(id: string): Promise<Contact | null>;

  /** Overwrite a contact's data (and optionally active) and bump updated_at. Null if not found. */
  update(id: string, update: ContactUpdate): Promise<Contact | null>;
}
