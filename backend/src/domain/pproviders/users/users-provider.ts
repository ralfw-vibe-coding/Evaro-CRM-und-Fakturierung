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

export interface UsersProvider {
  findByEmail(email: string): Promise<User | null>;
  insert(input: NewUser): Promise<User>;
}
