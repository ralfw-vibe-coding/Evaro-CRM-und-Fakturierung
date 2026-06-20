import type { Config } from "@netlify/functions";
import { getAppSettingsRpu, updateAppSettingsRpu } from "../../composition.js";
import type { InvoicingAppSettings } from "../../domain/model.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "GET") {
    const result = await getAppSettingsRpu()();
    if (!result.ok) return error(result.error, 422);
    return json({ settings: result.settings });
  }

  if (req.method === "PATCH") {
    let body: { invoicing?: InvoicingAppSettings };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    const result = await updateAppSettingsRpu()({
      user_id: client.user_id,
      invoicing: body.invoicing ?? {},
    });
    if (!result.ok) return error(result.error, 422);
    return json({ settings: result.settings });
  }

  return methodNotAllowed(["GET", "PATCH"]);
}

export const config: Config = {
  path: "/api/app-settings",
};
