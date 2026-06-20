import type pg from "pg";
import { UserAbbrAlreadyExistsError, type NewUser, type User, type UsersProvider } from "./users-provider.js";
import { getPool } from "../postgres/pool.js";

interface UserRow {
  id: string;
  email: string;
  abbr: string;
  api_key_created_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    abbr: row.abbr,
    api_key_created_at: row.api_key_created_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const USER_COLUMNS = "id, email, abbr, api_key_created_at, created_at, updated_at";

export class PostgresUsersProvider implements UsersProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByApiKeyHash(hash: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE api_key_hash = $1`,
      [hash],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async insert(input: NewUser): Promise<User> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (email, abbr) VALUES ($1, $2)
       RETURNING ${USER_COLUMNS}`,
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
         RETURNING ${USER_COLUMNS}`,
        [abbr, id],
      );
      return rows[0] ? toUser(rows[0]) : null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new UserAbbrAlreadyExistsError();
      throw error;
    }
  }

  async setApiKey(id: string, hash: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `UPDATE users
       SET api_key_hash = $1, api_key_created_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING ${USER_COLUMNS}`,
      [hash, id],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async clearApiKey(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `UPDATE users
       SET api_key_hash = NULL, api_key_created_at = NULL, updated_at = now()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
