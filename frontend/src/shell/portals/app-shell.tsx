import * as React from "react";
import { LogOut, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrmArea } from "./crm-area";
import { InvoicingArea } from "./invoicing-area";
import type { SessionUser } from "@/domain/model";

export type AppArea = "crm" | "invoicing";

const CLAIM = "Ganz leicht mit Kontakten Kohle machen";

export function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [area, setArea] = React.useState<AppArea>("crm");

  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      <Header user={user} area={area} onAreaChange={setArea} onLogout={onLogout} />
      <main className="min-h-0 overflow-hidden">
        {area === "crm" ? <CrmArea /> : <InvoicingArea />}
      </main>
    </div>
  );
}

function Header({
  user,
  area,
  onAreaChange,
  onLogout,
}: {
  user: SessionUser;
  area: AppArea;
  onAreaChange: (area: AppArea) => void;
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
        <UserMenu user={user} onLogout={onLogout} />
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

function UserMenu({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
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
        {/* Profil bearbeiten kommt mit Schritt 10 — hier noch ohne Funktion. */}
        <DropdownMenuItem disabled>
          <UserCog /> Profil bearbeiten
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
