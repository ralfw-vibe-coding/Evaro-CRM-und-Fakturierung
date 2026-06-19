// xProvider: proxy to the backend HTTP API. Encapsulates fetch, the API base
// path and the bearer-token handling so the rest of the frontend never touches
// transport details.

import type { SessionUser } from "@/domain/model";

const TOKEN_KEY = "evaro.token";
const USER_KEY = "evaro.user";

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fields?: Record<string, string> };

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    return { ok: false, error: "Server nicht erreichbar." };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fields?: Record<string, string> };
    return { ok: false, error: b.error ?? `Fehler ${res.status}`, fields: b.fields };
  }
  return { ok: true, value: body as T };
}

/** Step 1 of login: request an OTP for the given email. */
export async function requestOtp(email: string): Promise<ApiResult<void>> {
  const result = await request<{ ok: true }>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return result.ok ? { ok: true, value: undefined } : result;
}

/** Step 2 of login: verify the OTP and start a session. */
export async function verifyOtp(email: string, otp: string): Promise<ApiResult<SessionUser>> {
  const result = await request<{ token: string; user: SessionUser }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  if (!result.ok) return result;
  localStorage.setItem(TOKEN_KEY, result.value.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.value.user));
  return { ok: true, value: result.value.user };
}
