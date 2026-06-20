import type pg from "pg";
import { UserAbbrAlreadyExistsError, type NewUser, type User, type UsersProvider } from "./users-provider.js";
import { getPool } from "../postgres/pool.js";

interface UserRow {
  id: string;
  email: string;
  abbr: string;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    abbr: row.abbr,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export class PostgresUsersProvider implements UsersProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT id, email, abbr, created_at, updated_at FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async insert(input: NewUser): Promise<User> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (email, abbr) VALUES ($1, $2)
       RETURNING id, email, abbr, created_at, updated_at`,
      [input.email, input.abbr],
    );
    return toUser(rows[0]);
  }

  async updateAbbr(id: string, abbr: string): Promise<User | null> {
    try {
      const { rows } = await this.pool.query<UserRow>(
        `UPDATE users
         SET abbr = $1, updated_at = now()
         WHERE id = $2
         RETURNING id, email, abbr, created_at, updated_at`,
        [abbr, id],
      );
      return rows[0] ? toUser(rows[0]) : null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new UserAbbrAlreadyExistsError();
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
