import type { Config } from "@netlify/functions";
import { analyzeEmailImportRpu } from "../../composition.js";
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

  if (req.method !== "POST") return methodNotAllowed(["POST"]);

  let body: { email_text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return error("Ungültiger Request-Body.", 400);
  }

  try {
    const result = await analyzeEmailImportRpu()({
      email_text: body.email_text ?? "",
      today: todayGerman(),
    });
    if (!result.ok) return error(result.error, 422);
    return json(result.analysis);
  } catch (cause) {
    console.error("POST /api/email-import/analyze failed", cause);
    const message = cause instanceof Error ? cause.message : "Die E-Mail konnte nicht analysiert werden.";
    return error(message, 500);
  }
}

export const config: Config = {
  path: "/api/email-import/analyze",
};
