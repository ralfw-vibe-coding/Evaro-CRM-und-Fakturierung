import { hashApiKey } from "../../api-key.js";
import type { User, UsersProvider } from "../../pproviders/users/users-provider.js";

export interface AuthenticateApiKeyCommand {
  api_key: string;
}

export type AuthenticateApiKeyResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function authenticateApiKey(deps: { users: UsersProvider }) {
  return async function process(command: AuthenticateApiKeyCommand): Promise<AuthenticateApiKeyResult> {
    const api_key = command.api_key?.trim();
    if (!api_key) return { ok: false, error: "API-Key fehlt." };

    const user = await deps.users.findByApiKeyHash(hashApiKey(api_key));
    if (!user) return { ok: false, error: "Ungültiger API-Key." };
    return { ok: true, user };
  };
}
