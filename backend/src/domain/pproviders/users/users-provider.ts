export interface User {
  id: string;
  email: string;
  abbr: string;
  api_key_created_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewUser {
  email: string;
  abbr: string;
}

export class UserAbbrAlreadyExistsError extends Error {
  constructor() {
    super("User abbreviation already exists.");
    this.name = "UserAbbrAlreadyExistsError";
  }
}

export interface UsersProvider {
  findByEmail(email: string): Promise<User | null>;
  findByApiKeyHash(hash: string): Promise<User | null>;
  insert(input: NewUser): Promise<User>;
  updateAbbr(id: string, abbr: string): Promise<User | null>;
  setApiKey(id: string, hash: string): Promise<User | null>;
  clearApiKey(id: string): Promise<User | null>;
}
