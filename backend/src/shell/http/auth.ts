import { authenticateUserRpu, tokens } from "../../composition.js";

export interface AuthenticatedClient {
  user_id: string;
  email: string;
  abbr: string;
}

/**
 * Authenticate an incoming request. Two paths are accepted (see tech-stack.md):
 *  - a Bearer JWT issued by the login endpoint
 *  - a static API key (header `x-api-key`) for non-interactive clients
 *
 * Returns the authenticated client, or null if the request is not authenticated.
 */
export async function authenticate(req: Request): Promise<AuthenticatedClient | null> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY) {
    const result = await authenticateUserRpu()({ email: process.env.API_USER_EMAIL ?? "api@evaro.local" });
    if (!result.ok) return null;
    return {
      user_id: result.user.id,
      email: result.user.email,
      abbr: result.user.abbr,
    };
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const payload = await tokens().verify(header.slice("Bearer ".length).trim());
    if (payload) {
      const result = await authenticateUserRpu()({ email: payload.email });
      if (!result.ok) return null;
      return { user_id: result.user.id, email: result.user.email, abbr: result.user.abbr };
    }
  }

  return null;
}
