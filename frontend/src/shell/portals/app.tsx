import * as React from "react";
import { getStoredUser, clearSession } from "@/shell/xproviders/backend-proxy/backend-proxy";
import { LoginView } from "./login-view";
import { AppShell } from "./app-shell";
import type { SessionUser } from "@/domain/model";

export function App() {
  const [user, setUser] = React.useState<SessionUser | null>(() => getStoredUser());

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return <AppShell user={user} onLogout={logout} />;
}
