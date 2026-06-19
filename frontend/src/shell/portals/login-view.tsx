import * as React from "react";
import { Mail, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestOtp, verifyOtp } from "@/shell/xproviders/backend-proxy/backend-proxy";
import type { SessionUser } from "@/domain/model";

type Phase = "email" | "otp";

export function LoginView({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [phase, setPhase] = React.useState<Phase>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestOtp(email.trim());
    setBusy(false);
    if (result.ok) {
      setPhase("otp");
    } else {
      setError(result.error);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyOtp(email.trim(), otp.trim());
    setBusy(false);
    if (result.ok) {
      onLogin(result.value);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <span className="text-brand">Evaro</span>
          </CardTitle>
          <CardDescription>
            Anmelden oder neu registrieren — das ist hier dasselbe. Gib deine
            E-Mail ein, wir schicken dir einen Einmal-Code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {phase === "email" ? (
            <form onSubmit={submitEmail} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="du@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Mail />}
                Code anfordern
              </Button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="grid gap-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Code gesendet an <strong>{email}</strong>.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="otp">Einmal-Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Anmelden
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhase("email");
                  setOtp("");
                  setError(null);
                }}
              >
                <ArrowLeft /> Andere E-Mail
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
