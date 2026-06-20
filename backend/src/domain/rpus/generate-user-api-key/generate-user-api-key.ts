import { generateApiKey, hashApiKey } from "../../api-key.js";
import type { User, UsersProvider } from "../../pproviders/users/users-provider.js";

export interface GenerateUserApiKeyCommand {
  user_id: string;
}

export type GenerateUserApiKeyResult =
  | { ok: true; user: User; api_key: string }
  | { ok: false; error: string };

export function generateUserApiKey(deps: { users: UsersProvider }) {
  return async function process(command: GenerateUserApiKeyCommand): Promise<GenerateUserApiKeyResult> {
    const user_id = command.user_id?.trim();
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const api_key = generateApiKey();
    const user = await deps.users.setApiKey(user_id, hashApiKey(api_key));
    if (!user) return { ok: false, error: "Benutzer nicht gefunden." };
    return { ok: true, user, api_key };
  };
}
