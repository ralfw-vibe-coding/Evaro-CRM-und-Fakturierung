import type { Session, SessionProvider } from "./session-provider";

const TOKEN_KEY = "evaro.token";
const USER_KEY = "evaro.user";

export const browserSessionProvider: SessionProvider = {
  get() {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
    try {
      return { token, user: JSON.parse(rawUser) };
    } catch {
      return null;
    }
  },

  save({ token, user }: Session) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
