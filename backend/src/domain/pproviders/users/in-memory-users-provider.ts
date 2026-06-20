import { randomUUID } from "node:crypto";
import { UserAbbrAlreadyExistsError, type NewUser, type User, type UsersProvider } from "./users-provider.js";

export class InMemoryUsersProvider implements UsersProvider {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    const needle = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === needle) return structuredClone(user);
    }
    return null;
  }

  async insert(input: NewUser): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      email: input.email,
      abbr: input.abbr,
      api_key_created_at: null,
      created_at: now,
      updated_at: now,
    };
    this.users.set(user.id, user);
    return structuredClone(user);
  }

  async findByApiKeyHash(hash: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if ((user as User & { api_key_hash?: string }).api_key_hash === hash) return structuredClone(user);
    }
    return null;
  }

  async updateAbbr(id: string, abbr: string): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const duplicate = [...this.users.values()].some((user) => user.id !== id && user.abbr === abbr);
    if (duplicate) throw new UserAbbrAlreadyExistsError();
    const updated: User = {
      ...existing,
      abbr,
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return structuredClone(updated);
  }

  async setApiKey(id: string, hash: string): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: User & { api_key_hash?: string } = {
      ...existing,
      api_key_hash: hash,
      api_key_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return structuredClone(updated);
  }

  async clearApiKey(id: string): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: User & { api_key_hash?: string } = {
      ...existing,
      api_key_hash: undefined,
      api_key_created_at: null,
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return structuredClone(updated);
  }
}
