const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function error(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, status);
}

export function methodNotAllowed(allowed: string[]): Response {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...JSON_HEADERS, allow: allowed.join(", ") },
  });
}
