// Domain model types shared across the backend service.
// See requirements/crm-briefing.md for the conceptual model.

export type Gender = "m" | "f" | "d";
export type Salutation = "formal" | "informal";

/**
 * A communication channel. `type` is intentionally a free string (combobox
 * pattern); common values are "email", "phone", "mobile", "whatsapp",
 * "website". Multiple channels of the same type are allowed.
 */
export interface Channel {
  type: string;
  address: string;
}

export interface ContactData {
  title?: string;
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  salutation?: Salutation;
  origin?: string;
  company_text?: string;
  channels: Channel[];
  relationship?: string[];
  role?: string[];
  work_area?: string[];
  interests?: string[];
  tags?: string[];
  notes?: string;
}

export interface Contact {
  id: string;
  active: boolean;
  data: ContactData;
  created_at: string;
  updated_at: string;
}

export type EntityType = "contact" | "business_partner";

export interface ActivityLogEntry {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  follow_up_at: string | null;
  created_at: string;
}
