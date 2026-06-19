export interface TokenPayload {
  user_id: string;
  email: string;
  abbr: string;
}

/**
 * xProvider: issuing and verifying session tokens. Encapsulates the JWT
 * technology so the rest of the service stays independent of it.
 */
export interface TokensProvider {
  sign(payload: TokenPayload): Promise<string>;
  verify(token: string): Promise<TokenPayload | null>;
}
