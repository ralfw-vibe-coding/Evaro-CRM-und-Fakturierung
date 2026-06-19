// Client-side view of the domain model (mirrors backend/src/domain/model.ts).

export interface Channel {
  type: string;
  address: string;
}

export interface ContactData {
  title?: string;
  first_name?: string;
  last_name?: string;
  gender?: "m" | "f" | "d";
  salutation?: "formal" | "informal";
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

export interface SessionUser {
  id: string;
  email: string;
  abbr: string;
}
