import type { Config } from "@netlify/functions";
import {
  checkEmailIngestRpu,
  createIngestRpu,
  listIngestsRpu,
  updateIngestStatusRpu,
} from "../../composition.js";
import type { IngestStatus } from "../../domain/model.js";
import { authenticate } from "../http/auth.js";
import { error, json, methodNotAllowed } from "../http/responses.js";

function todayGerman(): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date());
}

export default async function handler(req: Request): Promise<Response> {
  const client = await authenticate(req);
  if (!client) return error("Nicht authentifiziert.", 401);

  if (req.method === "GET") {
    return json(await listIngestsRpu()());
  }

  if (req.method === "POST") {
    let body: { action?: string; raw_text?: string; source_label?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }

    if (body.action === "check_email") {
      try {
        const result = await checkEmailIngestRpu()({ today: todayGerman() });
        return json(result);
      } catch (cause) {
        console.error("POST /api/ingests check_email failed", cause);
        const message = cause instanceof Error ? cause.message : "Das Postfach konnte nicht geprüft werden.";
        return error(message, 500);
      }
    }

    const result = await createIngestRpu()({
      source_type: "clipboard",
      source_id: null,
      source_label: body.source_label ?? "Zwischenablage",
      raw_text: body.raw_text ?? "",
      today: todayGerman(),
    });
    if (!result.ok) return error(result.error, 422);
    return json({ ingest: result.ingest, duplicate: result.duplicate }, 201);
  }

  if (req.method === "PATCH") {
    let body: { id?: string; status?: IngestStatus };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Ungültiger Request-Body.", 400);
    }
    if (!body.id || !body.status) return error("Ingest-ID oder Status fehlt.", 400);
    const result = await updateIngestStatusRpu()({ id: body.id, status: body.status });
    if (!result.ok) return error(result.error, 404);
    return json({ ingest: result.ingest });
  }

  return methodNotAllowed(["GET", "POST", "PATCH"]);
}

export const config: Config = {
  path: "/api/ingests",
};
