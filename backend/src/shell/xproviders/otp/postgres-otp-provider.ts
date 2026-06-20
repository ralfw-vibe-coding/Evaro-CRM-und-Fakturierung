import type pg from "pg";
import { getPool } from "../../../domain/pproviders/postgres/pool.js";
import type { OtpChallenge, OtpProvider } from "./otp-provider.js";

export class PostgresOtpProvider implements OtpProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async store(challenge: OtpChallenge): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_otps (email, code_hash, expires_at)
       VALUES (lower($1), $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET code_hash = EXCLUDED.code_hash,
                     expires_at = EXCLUDED.expires_at,
                     consumed_at = NULL,
                     created_at = now()`,
      [challenge.email, challenge.code_hash, challenge.expires_at],
    );
  }

  async consume(email: string, code_hash: string, now: Date): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE auth_otps
       SET consumed_at = now()
       WHERE email = lower($1)
         AND code_hash = $2
         AND consumed_at IS NULL
         AND expires_at > $3
       RETURNING email`,
      [email, code_hash, now.toISOString()],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
