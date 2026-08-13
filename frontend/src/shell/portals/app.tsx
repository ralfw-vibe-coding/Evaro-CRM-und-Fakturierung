import * as React from "react";
import { getSessionRpu, logoutRpu, refreshSessionRpu } from "@/composition";
import { LoginView } from "./login-view";
import { AppShell } from "./app-shell";
import type { SessionUser } from "@/domain/model";

/**
 * Wie oft die Sitzung höchstens verlängert wird. Das Token gilt 7 Tage; einmal
 * pro Stunde zu verlängern reicht dafür bei Weitem und hält die Zahl der
 * Aufrufe klein, auch wenn der Tab häufig gewechselt wird.
 */
const REFRESH_THROTTLE_MS = 60 * 60 * 1000;

/** Rückfallebene für Tabs, die tagelang offen bleiben, ohne sichtbar zu werden. */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function App() {
  const [user, setUser] = React.useState<SessionUser | null>(() => getSessionRpu());
  const loggedIn = Boolean(user);

  // Sitzung bei jeder Nutzung verlängern: beim Start, beim Zurückkehren in den
  // Tab und als Rückfallebene periodisch. So läuft sie nur nach echter
  // Inaktivität ab, statt hart nach Ablauf der Token-Gültigkeit.
  React.useEffect(() => {
    if (!loggedIn) return;

    let lastRun = 0;
    let cancelled = false;

    async function maybeRefresh() {
      const now = Date.now();
      if (cancelled || now - lastRun < REFRESH_THROTTLE_MS) return;
      lastRun = now;
      await refreshSessionRpu();
    }

    function onVisible() {
      if (document.visibilityState === "visible") void maybeRefresh();
    }

    void maybeRefresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void maybeRefresh(), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [loggedIn]);

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  function logout() {
    logoutRpu();
    setUser(null);
  }

  return <AppShell user={user} onUserChange={setUser} onLogout={logout} />;
}
