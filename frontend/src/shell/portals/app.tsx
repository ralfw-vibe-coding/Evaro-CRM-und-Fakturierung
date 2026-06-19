import * as React from "react";
import { getSessionRpu, logoutRpu } from "@/composition";
import { LoginView } from "./login-view";
import { AppShell } from "./app-shell";
import type { SessionUser } from "@/domain/model";

export function App() {
  const [user, setUser] = React.useState<SessionUser | null>(() => getSessionRpu());

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  function logout() {
    logoutRpu();
    setUser(null);
  }

  return <AppShell user={user} onLogout={logout} />;
}
