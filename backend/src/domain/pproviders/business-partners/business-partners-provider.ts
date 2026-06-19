import type { BusinessPartner, BusinessPartnerData } from "../../model.js";

export interface NewBusinessPartner {
  types: string[];
  data: BusinessPartnerData;
}

export interface BusinessPartnerUpdate {
  types: string[];
  data: BusinessPartnerData;
}

/**
 * Persistence abstraction for business partners. Only RPUs depend on this.
 */
export interface BusinessPartnersProvider {
  /** Insert a new business partner and return the stored record. */
  insert(input: NewBusinessPartner): Promise<BusinessPartner>;

  /** All business partners (the selection sends them all; see crm-briefing.md). */
  listAll(): Promise<BusinessPartner[]>;

  /** A single business partner by id, or null if it doesn't exist. */
  findById(id: string): Promise<BusinessPartner | null>;

  /** Overwrite a business partner and bump updated_at. Null if not found. */
  update(id: string, update: BusinessPartnerUpdate): Promise<BusinessPartner | null>;
}
