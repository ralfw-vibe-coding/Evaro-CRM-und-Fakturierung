import * as React from "react";
import { Copy, KeyRound, LogOut, Save, Settings, Trash2, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteApiKeyRpu,
  generateApiKeyRpu,
  loadAppSettingsRpu,
  updateAppSettingsRpu,
  updateProfileRpu,
} from "@/composition";
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
import type { AppSettings, InvoicingAppSettings, SessionUser } from "@/domain/model";

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
  const [editingAppSettings, setEditingAppSettings] = React.useState(false);

  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      <Header
        user={user}
        area={area}
        onAreaChange={setArea}
        onEditProfile={() => setEditingProfile(true)}
        onEditAppSettings={() => setEditingAppSettings(true)}
        onLogout={onLogout}
      />
      <main className="min-h-0 overflow-hidden">
        {area === "crm" ? <CrmArea /> : <InvoicingArea />}
      </main>
      {editingProfile && (
        <ProfileDialog
          user={user}
          onClose={() => setEditingProfile(false)}
          onUserChange={(nextUser) => {
            onUserChange(nextUser);
          }}
          onSaved={(nextUser) => {
            onUserChange(nextUser);
            setEditingProfile(false);
          }}
        />
      )}
      {editingAppSettings && <AppSettingsDialog onClose={() => setEditingAppSettings(false)} />}
    </div>
  );
}

function Header({
  user,
  area,
  onAreaChange,
  onEditProfile,
  onEditAppSettings,
  onLogout,
}: {
  user: SessionUser;
  area: AppArea;
  onAreaChange: (area: AppArea) => void;
  onEditProfile: () => void;
  onEditAppSettings: () => void;
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
        <UserMenu
          user={user}
          onEditProfile={onEditProfile}
          onEditAppSettings={onEditAppSettings}
          onLogout={onLogout}
        />
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
  onEditAppSettings,
  onLogout,
}: {
  user: SessionUser;
  onEditProfile: () => void;
  onEditAppSettings: () => void;
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
        <DropdownMenuItem onSelect={onEditAppSettings}>
          <Settings /> App Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const EMPTY_INVOICING_SETTINGS: InvoicingAppSettings = {
  company_name: "",
  sender_address: "",
  bank_details: "",
  company_registration: "",
  default_payment_due_days: undefined,
  vat_number: "",
  contact_person: "",
  email: "",
  phone: "",
  website: "",
};

function normalizeInvoicingSettings(settings: AppSettings | null): InvoicingAppSettings {
  return { ...EMPTY_INVOICING_SETTINGS, ...(settings?.invoicing ?? {}) };
}

function AppSettingsDialog({ onClose }: { onClose: () => void }) {
  const [initial, setInitial] = React.useState<InvoicingAppSettings>(EMPTY_INVOICING_SETTINGS);
  const [draft, setDraft] = React.useState<InvoicingAppSettings>(EMPTY_INVOICING_SETTINGS);
  const [status, setStatus] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<"info" | "error">("info");
  const [busy, setBusy] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    loadAppSettingsRpu().then((result) => {
      if (cancelled) return;
      setBusy(false);
      if (!result.ok) {
        setStatus(result.error);
        setStatusTone("error");
        return;
      }
      const next = normalizeInvoicingSettings(result.settings);
      setInitial(next);
      setDraft(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function patch(key: keyof InvoicingAppSettings, value: string | number | undefined) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setStatus(null);
    const result = await updateAppSettingsRpu({ invoicing: draft });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusTone("error");
      return;
    }
    const next = normalizeInvoicingSettings(result.settings);
    setInitial(next);
    setDraft(next);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-4">
      <form
        onSubmit={(event) => event.preventDefault()}
        className="grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">App Settings</div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" aria-label="Speichern" onClick={save} disabled={!dirty || busy}>
              <Save />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Schließen" onClick={onClose}>
              <X />
            </Button>
          </div>
        </div>

        <section className="grid gap-3">
          <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Fakturierung</div>
          <SettingsField label="Firmenname">
            <Input
              value={draft.company_name ?? ""}
              autoFocus
              onChange={(event) => patch("company_name", event.target.value)}
            />
          </SettingsField>
          <SettingsField label="Anschrift">
            <textarea
              value={draft.sender_address ?? ""}
              onChange={(event) => patch("sender_address", event.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </SettingsField>
          <div className="grid grid-cols-3 items-start gap-3">
            <SettingsField label="USt-Nr.">
              <Input value={draft.vat_number ?? ""} onChange={(event) => patch("vat_number", event.target.value)} />
            </SettingsField>
            <SettingsField label="Firmenregistrierung">
              <textarea
                value={draft.company_registration ?? ""}
                onChange={(event) => patch("company_registration", event.target.value)}
                rows={3}
                className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </SettingsField>
            <SettingsField label="Zahlungszeitraum in Tagen">
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.default_payment_due_days ?? ""}
                onChange={(event) =>
                  patch(
                    "default_payment_due_days",
                    event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)),
                  )
                }
              />
            </SettingsField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SettingsField label="Ansprechpartner">
              <Input
                value={draft.contact_person ?? ""}
                onChange={(event) => patch("contact_person", event.target.value)}
              />
            </SettingsField>
            <SettingsField label="E-Mail">
              <Input value={draft.email ?? ""} onChange={(event) => patch("email", event.target.value)} />
            </SettingsField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SettingsField label="Telefon">
              <Input value={draft.phone ?? ""} onChange={(event) => patch("phone", event.target.value)} />
            </SettingsField>
            <SettingsField label="Website">
              <Input value={draft.website ?? ""} onChange={(event) => patch("website", event.target.value)} />
            </SettingsField>
          </div>
          <SettingsField label="Bankverbindung">
            <textarea
              value={draft.bank_details ?? ""}
              onChange={(event) => patch("bank_details", event.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </SettingsField>
        </section>

        {status && <p className={cn("text-sm", statusTone === "error" && "text-[var(--destructive)]")}>{status}</p>}
      </form>
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProfileDialog({
  user,
  onUserChange,
  onSaved,
  onClose,
}: {
  user: SessionUser;
  onUserChange: (user: SessionUser) => void;
  onSaved: (user: SessionUser) => void;
  onClose: () => void;
}) {
  const [abbr, setAbbr] = React.useState(user.abbr);
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<"info" | "error">("info");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [deleteKeyArmed, setDeleteKeyArmed] = React.useState(false);
  const dirty = abbr.trim().toUpperCase() !== user.abbr;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    setStatus(null);
    setStatusTone("info");
    setErrors({});
    const result = await updateProfileRpu({ abbr });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusTone("error");
      setErrors(result.fields ?? {});
      return;
    }
    onSaved(result.user);
  }

  async function generateKey() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    setStatusTone("info");
    setGeneratedKey(null);
    setDeleteKeyArmed(false);
    const result = await generateApiKeyRpu();
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusTone("error");
      return;
    }
    setGeneratedKey(result.api_key);
    onUserChange(result.user);
    setStatusTone("info");
    setStatus("API-Key erzeugt. Er wird nur jetzt angezeigt.");
  }

  async function deleteKey() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    setStatusTone("info");
    setGeneratedKey(null);
    const result = await deleteApiKeyRpu();
    setBusy(false);
    setDeleteKeyArmed(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusTone("error");
      return;
    }
    onUserChange(result.user);
    setStatusTone("info");
    setStatus("API-Key gelöscht.");
  }

  async function copyGeneratedKey() {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setStatusTone("info");
      setStatus("API-Key kopiert.");
    } catch {
      setStatusTone("error");
      setStatus("Kopieren nicht möglich.");
    }
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
        <div className="grid gap-2 border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label>API-Key</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                {user.api_key_created_at ? "Generiert" : "Nicht generiert"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={generateKey} disabled={busy}>
                <KeyRound /> {user.api_key_created_at ? "Neu" : "Generieren"}
              </Button>
              {user.api_key_created_at && (
                <Button
                  type="button"
                  variant={deleteKeyArmed ? "destructive" : "ghost"}
                  size="icon"
                  disabled={busy}
                  aria-label={deleteKeyArmed ? "Zum Löschen erneut klicken" : "API-Key löschen"}
                  title={deleteKeyArmed ? "Zum Löschen erneut klicken" : "API-Key löschen"}
                  onBlur={() => setDeleteKeyArmed(false)}
                  onClick={() => {
                    if (!deleteKeyArmed) {
                      setDeleteKeyArmed(true);
                      return;
                    }
                    deleteKey();
                  }}
                >
                  {deleteKeyArmed ? "?" : <Trash2 />}
                </Button>
              )}
            </div>
          </div>
          {generatedKey && (
            <div className="grid gap-1.5 rounded-md border border-[var(--border)] bg-[var(--accent)] p-3">
              <Label htmlFor="profile-api-key">Nur jetzt sichtbar</Label>
              <div className="flex gap-2">
                <Input id="profile-api-key" readOnly value={generatedKey} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="API-Key kopieren"
                  title="API-Key kopieren"
                  onClick={copyGeneratedKey}
                >
                  <Copy />
                </Button>
              </div>
            </div>
          )}
        </div>
        {status && (
          <p className={cn("text-sm", statusTone === "error" && "text-[var(--destructive)]")}>
            {status}
          </p>
        )}
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
