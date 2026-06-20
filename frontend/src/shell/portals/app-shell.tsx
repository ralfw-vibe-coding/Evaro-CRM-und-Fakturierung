import * as React from "react";
import { LogOut, Save, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileRpu } from "@/composition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrmArea } from "./crm-area";
import { InvoicingArea } from "./invoicing-area";
import type { SessionUser } from "@/domain/model";

export type AppArea = "crm" | "invoicing";

const CLAIM = "Ganz leicht mit Kontakten Kohle machen";

export function AppShell({
  user,
  onUserChange,
  onLogout,
}: {
  user: SessionUser;
  onUserChange: (user: SessionUser) => void;
  onLogout: () => void;
}) {
  const [area, setArea] = React.useState<AppArea>("crm");
  const [editingProfile, setEditingProfile] = React.useState(false);

  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      <Header
        user={user}
        area={area}
        onAreaChange={setArea}
        onEditProfile={() => setEditingProfile(true)}
        onLogout={onLogout}
      />
      <main className="min-h-0 overflow-hidden">
        {area === "crm" ? <CrmArea /> : <InvoicingArea />}
      </main>
      {editingProfile && (
        <ProfileDialog
          user={user}
          onClose={() => setEditingProfile(false)}
          onSaved={(nextUser) => {
            onUserChange(nextUser);
            setEditingProfile(false);
          }}
        />
      )}
    </div>
  );
}

function Header({
  user,
  area,
  onAreaChange,
  onEditProfile,
  onLogout,
}: {
  user: SessionUser;
  area: AppArea;
  onAreaChange: (area: AppArea) => void;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--border)] px-6 py-3">
      {/* Brand + claim */}
      <div className="flex flex-col">
        <span className="text-xl font-bold leading-tight text-brand">Evaro</span>
        <span className="text-xs text-[var(--muted-foreground)]">{CLAIM}</span>
      </div>

      {/* Area switcher */}
      <AreaSwitcher area={area} onAreaChange={onAreaChange} />

      {/* User menu */}
      <div className="flex justify-end">
        <UserMenu user={user} onEditProfile={onEditProfile} onLogout={onLogout} />
      </div>
    </header>
  );
}

function AreaSwitcher({
  area,
  onAreaChange,
}: {
  area: AppArea;
  onAreaChange: (area: AppArea) => void;
}) {
  const tabs: { id: AppArea; label: string }[] = [
    { id: "crm", label: "CRM" },
    { id: "invoicing", label: "Fakturierung" },
  ];
  return (
    <div className="inline-flex rounded-md border border-[var(--border)] p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onAreaChange(tab.id)}
          className={cn(
            "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
            area === tab.id
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UserMenu({
  user,
  onEditProfile,
  onLogout,
}: {
  user: SessionUser;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Benutzermenü"
          className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {user.abbr}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="font-semibold">{user.abbr}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onEditProfile}>
          <UserCog /> Profil bearbeiten
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileDialog({
  user,
  onSaved,
  onClose,
}: {
  user: SessionUser;
  onSaved: (user: SessionUser) => void;
  onClose: () => void;
}) {
  const [abbr, setAbbr] = React.useState(user.abbr);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const dirty = abbr.trim().toUpperCase() !== user.abbr;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    setStatus(null);
    setErrors({});
    const result = await updateProfileRpu({ abbr });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setErrors(result.fields ?? {});
      return;
    }
    onSaved(result.user);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-4">
      <form
        onSubmit={save}
        className="grid w-full max-w-sm gap-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Profil bearbeiten</div>
          <Button type="button" variant="ghost" size="icon" aria-label="Schließen" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="grid gap-1.5">
          <Label>E-Mail</Label>
          <div className="rounded-md border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
            {user.email}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-abbr">Kürzel</Label>
          <Input
            id="profile-abbr"
            value={abbr}
            maxLength={6}
            autoFocus
            onChange={(event) => setAbbr(event.target.value.toUpperCase())}
          />
          {errors.abbr && <p className="text-xs text-[var(--destructive)]">{errors.abbr}</p>}
        </div>
        {status && <p className="text-sm text-[var(--destructive)]">{status}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!dirty || busy}>
            <Save /> Speichern
          </Button>
        </div>
      </form>
    </div>
  );
}
