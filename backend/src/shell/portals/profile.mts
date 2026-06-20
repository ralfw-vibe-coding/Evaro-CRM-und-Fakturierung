import type { Config } from "@netlify/functions";
import {
  deleteUserApiKeyRpu,
  generateUserApiKeyRpu,
  updateUserProfileRpu,
} from "../../composition.js";
import type { User } from "../../domain/pproviders/users/users-provider.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    abbr: user.abbr,
    api_key_created_at: user.api_key_created_at,
  };
}

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "PATCH") {
    let body: { abbr?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await updateUserProfileRpu()({
      user_id: client.user_id,
      abbr: body.abbr ?? "",
    });

    if (!result.ok) return error(result.error, 422, { fields: result.fields });
    return json({ user: publicUser(result.user) });
  }

  if (req.method === "POST") {
    const result = await generateUserApiKeyRpu()({ user_id: client.user_id });
    if (!result.ok) return error(result.error, 422);
    return json({ user: publicUser(result.user), api_key: result.api_key }, 201);
  }

  if (req.method === "DELETE") {
    const result = await deleteUserApiKeyRpu()({ user_id: client.user_id });
    if (!result.ok) return error(result.error, 422);
    return json({ user: publicUser(result.user) });
  }

  return methodNotAllowed(["PATCH", "POST", "DELETE"]);
}

export const config: Config = {
  path: "/api/profile",
};
