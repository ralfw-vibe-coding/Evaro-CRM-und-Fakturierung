import type { User, UsersProvider } from "../../pproviders/users/users-provider.js";

export interface DeleteUserApiKeyCommand {
  user_id: string;
}

export type DeleteUserApiKeyResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function deleteUserApiKey(deps: { users: UsersProvider }) {
  return async function process(command: DeleteUserApiKeyCommand): Promise<DeleteUserApiKeyResult> {
    const user_id = command.user_id?.trim();
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const user = await deps.users.clearApiKey(user_id);
    if (!user) return { ok: false, error: "Benutzer nicht gefunden." };
    return { ok: true, user };
  };
}
