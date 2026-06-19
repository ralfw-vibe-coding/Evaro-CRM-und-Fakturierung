import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload, TokensProvider } from "./tokens-provider.js";

const ALG = "HS256";
const EXPIRY = "7d"; // JWT valid for one week (see tech-stack.md)

export class JwtTokensProvider implements TokensProvider {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    if (!secret) throw new Error("JWT secret must not be empty.");
    this.secret = new TextEncoder().encode(secret);
  }

  async sign(payload: TokenPayload): Promise<string> {
    return new SignJWT({ email: payload.email, abbr: payload.abbr })
      .setProtectedHeader({ alg: ALG })
      .setSubject(payload.user_id)
      .setIssuedAt()
      .setExpirationTime(EXPIRY)
      .sign(this.secret);
  }

  async verify(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      if (!payload.sub) return null;
      return {
        user_id: payload.sub,
        email: String(payload.email ?? ""),
        abbr: String(payload.abbr ?? ""),
      };
    } catch {
      return null;
    }
  }
}
