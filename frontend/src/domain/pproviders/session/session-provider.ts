import type { SessionUser } from "@/domain/model";

export interface Session {
  token: string;
  user: SessionUser;
}

/**
 * pProvider: encapsulates how the frontend's own session state (logged-in
 * user, auth token) is held. The real implementation uses localStorage — the
 * frontend's persistence medium for session state, just as Postgres is the
 * backend's medium for CRM state.
 */
export interface SessionProvider {
  get(): Session | null;
  save(session: Session): void;
  clear(): void;
}
