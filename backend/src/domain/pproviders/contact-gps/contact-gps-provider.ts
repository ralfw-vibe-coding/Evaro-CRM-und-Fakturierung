import type { ContactGp } from "../../model.js";

export interface ContactGpInput {
  contact_id: string;
  gp_id: string;
  role: string;
  primary?: boolean;
}

export interface ContactGpsProvider {
  /** All relationship rows, used for the initial frontend selection. */
  listAll(): Promise<ContactGp[]>;

  /** Create or update the relationship between a contact and a business partner. */
  upsert(input: ContactGpInput): Promise<ContactGp>;

  /** Delete a relationship. Returns true when a row was deleted. */
  delete(contact_id: string, gp_id: string): Promise<boolean>;

  /** Delete every relationship for one contact. */
  deleteForContact(contact_id: string): Promise<number>;

  /** Delete every relationship for one business partner. */
  deleteForBusinessPartner(gp_id: string): Promise<number>;
}
