import { UserAbbrAlreadyExistsError, type User, type UsersProvider } from "../../pproviders/users/users-provider.js";

export interface UpdateUserProfileCommand {
  user_id: string;
  abbr: string;
}

export type UpdateUserProfileResult =
  | { ok: true; user: User }
  | { ok: false; error: string; fields?: Record<string, string> };

function normalizeAbbr(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function updateUserProfile(deps: { users: UsersProvider }) {
  return async function process(command: UpdateUserProfileCommand): Promise<UpdateUserProfileResult> {
    const user_id = command.user_id?.trim();
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const abbr = normalizeAbbr(command.abbr);
    if (!abbr) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields: { abbr: "Bitte ein Kürzel angeben." } };
    }
    if (abbr.length > 6) {
      return {
        ok: false,
        error: "Validierung fehlgeschlagen.",
        fields: { abbr: "Das Kürzel darf höchstens 6 Zeichen lang sein." },
      };
    }

    let user: User | null;
    try {
      user = await deps.users.updateAbbr(user_id, abbr);
    } catch (error) {
      if (error instanceof UserAbbrAlreadyExistsError) {
        return {
          ok: false,
          error: "Validierung fehlgeschlagen.",
          fields: { abbr: "Dieses Kürzel ist bereits vergeben." },
        };
      }
      throw error;
    }
    if (!user) return { ok: false, error: "Benutzer nicht gefunden." };
    return { ok: true, user };
  };
}
