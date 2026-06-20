export interface User {
  id: string;
  email: string;
  abbr: string;
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
  insert(input: NewUser): Promise<User>;
  updateAbbr(id: string, abbr: string): Promise<User | null>;
}
