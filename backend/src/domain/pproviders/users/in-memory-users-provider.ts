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
      created_at: now,
      updated_at: now,
    };
    this.users.set(user.id, user);
    return structuredClone(user);
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
}
