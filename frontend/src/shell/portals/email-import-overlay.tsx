import * as React from "react";
import { Building2, Check, Inbox, Loader2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createClipboardIngestRpu,
  createBusinessPartnerRpu,
  createContactRpu,
  loadIngestsRpu,
  linkContactGpRpu,
  updateIngestStatusRpu,
} from "@/composition";
import type { BusinessPartner, BusinessPartnerData, Contact, ContactData, IngestItem } from "@/domain/model";
import type { EmailImportAnalysis, EmailImportMatch } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";

type Choice = "new" | string;

function contactName(data: ContactData): string {
  return [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || "Neuer Kontakt";
}

function existingContactName(contact: Contact): string {
  return contactName(contact.data);
}

function channel(data: { channels: { type: string; address: string }[] }, type: string): string | undefined {
  return data.channels.find((item) => item.type === type)?.address;
}

function compactLines(lines: Array<string | undefined>): string[] {
  return lines.map((line) => line?.trim()).filter(Boolean) as string[];
}

function SummaryLines({ lines }: { lines: string[] }) {
  return (
    <div className="grid gap-0.5 text-xs text-[var(--muted-foreground)]">
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

function MatchButton<T>({
  active,
  match,
  title,
  lines,
  onClick,
}: {
  active: boolean;
  match?: EmailImportMatch<T>;
  title: string;
  lines: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "grid gap-1 rounded-md border p-3 text-left transition-colors",
        active ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-[var(--border)] hover:bg-[var(--accent)]",
      ].join(" ")}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        {match && <span className="text-xs text-[var(--muted-foreground)]">{match.score}</span>}
      </div>
      <SummaryLines lines={lines} />
      {match?.reason && <div className="text-xs text-[var(--muted-foreground)]">{match.reason}</div>}
    </button>
  );
}

function ContactChoice({
  proposal,
  matches,
  choice,
  onChoice,
  enabled,
  onEnabledChange,
}: {
  proposal: ContactData;
  matches: Array<EmailImportMatch<Contact>>;
  choice: Choice;
  onChoice: (choice: Choice) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex h-9 min-h-9 items-center justify-between gap-3 overflow-hidden border-b border-[var(--border)] bg-[var(--accent)] px-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap font-semibold uppercase text-[var(--muted-foreground)]">
          <User className="size-3.5 text-[var(--brand)]" />
          <span className="truncate">Kontakt</span>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]">
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
          übernehmen
        </label>
      </div>
      <div className={["flex flex-1 flex-col justify-start gap-2 p-3", enabled ? "" : "pointer-events-none opacity-45"].join(" ")}>
        <MatchButton
          active={choice === "new"}
          title={`Neu anlegen: ${contactName(proposal)}`}
          lines={compactLines([
            proposal.company_text,
            channel(proposal, "email"),
            proposal.interests?.join(", "),
            proposal.notes,
          ])}
          onClick={() => onChoice("new")}
        />
        {matches.map((match) => (
          <MatchButton
            key={match.entity.id}
            active={choice === match.entity.id}
            match={match}
            title={`Vorhanden: ${existingContactName(match.entity)}`}
            lines={compactLines([match.entity.data.company_text, channel(match.entity.data, "email")])}
            onClick={() => onChoice(match.entity.id)}
          />
        ))}
      </div>
    </section>
  );
}

function BusinessPartnerChoice({
  proposal,
  matches,
  choice,
  onChoice,
  enabled,
  onEnabledChange,
}: {
  proposal: BusinessPartnerData;
  matches: Array<EmailImportMatch<BusinessPartner>>;
  choice: Choice;
  onChoice: (choice: Choice) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const address = proposal.address;
  return (
    <section className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex h-9 min-h-9 items-center justify-between gap-3 overflow-hidden border-b border-[var(--border)] bg-[var(--accent)] px-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap font-semibold uppercase text-[var(--muted-foreground)]">
          <Building2 className="size-3.5 text-[var(--gp)]" />
          <span className="truncate">Geschäftspartner</span>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]">
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
          übernehmen
        </label>
      </div>
      <div className={["flex flex-1 flex-col justify-start gap-2 p-3", enabled ? "" : "pointer-events-none opacity-45"].join(" ")}>
        <MatchButton
          active={choice === "new"}
          title={`Neu anlegen: ${proposal.name || "Geschäftspartner"}`}
          lines={compactLines([
            [address?.street, address?.zip, address?.city].filter(Boolean).join(", "),
            address?.country,
            proposal.vat_id,
            channel(proposal, "website"),
          ])}
          onClick={() => onChoice("new")}
        />
        {matches.map((match) => (
          <MatchButton
            key={match.entity.id}
            active={choice === match.entity.id}
            match={match}
            title={`Vorhanden: ${match.entity.data.name}`}
            lines={compactLines([
              [match.entity.data.address?.zip, match.entity.data.address?.city].filter(Boolean).join(" "),
              channel(match.entity.data, "website"),
            ])}
            onClick={() => onChoice(match.entity.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function EmailImportOverlay({
  onClose,
  onChanged,
  onNavigate,
  initialMode = "inbox",
  initialSelectedId,
}: {
  onClose: () => void;
  onChanged: () => void;
  onNavigate: (ref: EntityRef) => void;
  initialMode?: "inbox" | "clipboard";
  initialSelectedId?: string | null;
}) {
  const [ingests, setIngests] = React.useState<IngestItem[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [contactChoice, setContactChoice] = React.useState<Choice>("new");
  const [gpChoice, setGpChoice] = React.useState<Choice>("new");
  const [includeContact, setIncludeContact] = React.useState(true);
  const [includeGp, setIncludeGp] = React.useState(true);
  const [clipboardPanelOpen, setClipboardPanelOpen] = React.useState(initialMode === "clipboard");
  const [clipboardText, setClipboardText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const clipboardTextRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selected = ingests.find((ingest) => ingest.id === selectedId) ?? ingests[0] ?? null;
  const analysis = selected?.analysis as EmailImportAnalysis | null;

  React.useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  React.useEffect(() => {
    void refresh();
  }, []);

  React.useEffect(() => {
    if (initialMode !== "clipboard") return;
    void openClipboardPanel();
  }, [initialMode]);

  React.useEffect(() => {
    if (!analysis) return;
    setContactChoice(analysis.matches.contacts[0]?.entity.id ?? "new");
    setGpChoice(analysis.matches.business_partners[0]?.entity.id ?? "new");
    setIncludeContact(true);
    setIncludeGp(true);
  }, [selected?.id]);

  async function refresh(selectId?: string) {
    const result = await loadIngestsRpu();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setIngests(result.result.ingests);
    setPendingCount(result.result.pending_count);
    setSelectedId(selectId ?? initialSelectedId ?? selectedId ?? result.result.ingests[0]?.id ?? null);
  }

  async function openClipboardPanel() {
    setClipboardPanelOpen(true);
    setError(null);
    window.setTimeout(() => clipboardTextRef.current?.focus(), 0);
    try {
      const value = await navigator.clipboard.readText();
      if (value.trim()) setClipboardText(value);
    } catch {
      setError("Die Zwischenablage konnte nicht gelesen werden. Du kannst den Text manuell einsetzen.");
    }
  }

  async function createFromClipboardText() {
    if (!clipboardText.trim()) {
      setError("Bitte setze zuerst den E-Mail-Text ein.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createClipboardIngestRpu(clipboardText);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setClipboardPanelOpen(false);
    setClipboardText("");
    await refresh(result.ingest.id);
  }

  async function resolveContact(): Promise<Contact | null> {
    if (!analysis || !includeContact) return null;
    if (contactChoice !== "new") {
      return analysis.matches.contacts.find((match) => match.entity.id === contactChoice)?.entity ?? null;
    }
    const result = await createContactRpu({ active: true, data: analysis.proposal.contact });
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.contact;
  }

  async function resolveBusinessPartner(): Promise<BusinessPartner | null> {
    if (!analysis || !includeGp) return null;
    if (gpChoice !== "new") {
      return analysis.matches.business_partners.find((match) => match.entity.id === gpChoice)?.entity ?? null;
    }
    const result = await createBusinessPartnerRpu({ types: [], data: analysis.proposal.business_partner });
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.businessPartner;
  }

  async function accept() {
    if (!analysis || !selected) return;
    if (!includeContact && !includeGp) {
      setError("Bitte wähle Kontakt, Geschäftspartner oder beides zur Übernahme.");
      return;
    }
    setBusy(true);
    setError(null);
    const contact = await resolveContact();
    const businessPartner = await resolveBusinessPartner();
    if ((includeContact && !contact) || (includeGp && !businessPartner)) {
      setBusy(false);
      return;
    }
    if (contact && businessPartner) {
      const link = await linkContactGpRpu({
        contact_id: contact.id,
        gp_id: businessPartner.id,
        role: "",
        primary: false,
      });
      if (!link.ok) {
        setBusy(false);
        setError(link.error);
        return;
      }
    }
    const status = await updateIngestStatusRpu(selected.id, "accepted");
    setBusy(false);
    if (!status.ok) {
      setError(status.error);
      return;
    }
    onChanged();
    await refresh(selected.id);
    if (contact) onNavigate({ kind: "contact", id: contact.id });
    else if (businessPartner) onNavigate({ kind: "business_partner", id: businessPartner.id });
  }

  async function ignoreSelected() {
    if (!selected) return;
    const ignoredId = selected.id;
    setBusy(true);
    setError(null);
    const result = await updateIngestStatusRpu(ignoredId, "ignored");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const refreshed = await loadIngestsRpu();
    if (!refreshed.ok) {
      setError(refreshed.error);
      return;
    }
    setIngests(refreshed.result.ingests);
    setPendingCount(refreshed.result.pending_count);
    const next =
      refreshed.result.ingests.find((ingest) => ingest.status === "pending" && ingest.id !== ignoredId) ??
      refreshed.result.ingests.find((ingest) => ingest.id !== ignoredId) ??
      null;
    setSelectedId(next?.id ?? null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4">
      <div className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <Inbox className="size-4 text-[var(--brand)]" />
            <div className="font-semibold">Ingest Inbox</div>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
              {pendingCount} offen
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
              <X />
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-auto border-r border-[var(--border)] p-3">
            <div className="grid gap-2">
              {ingests.map((ingest) => (
                <button
                  key={ingest.id}
                  type="button"
                  className={[
                    "grid gap-1 rounded-md border p-2 text-left text-sm",
                    selected?.id === ingest.id ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-[var(--border)] hover:bg-[var(--accent)]",
                  ].join(" ")}
                  onClick={() => {
                    setSelectedId(ingest.id);
                    setClipboardPanelOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{ingest.source_label ?? ingest.source_type}</span>
                    <span className="text-[10px] uppercase text-[var(--muted-foreground)]">{ingest.status}</span>
                  </div>
                  <div className="truncate text-xs text-[var(--muted-foreground)]">
                    {new Date(ingest.created_at).toLocaleString("de-DE")}
                  </div>
                </button>
              ))}
              {ingests.length === 0 && (
                <div className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
                  Noch keine Ingests.
                </div>
              )}
            </div>
          </div>
          <div className="min-h-0 overflow-auto p-4">
          {clipboardPanelOpen ? (
            <div className="mb-4 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--accent)]/35 p-3">
              <div className="text-sm font-semibold">E-Mail-Text einsetzen</div>
              <Textarea
                ref={clipboardTextRef}
                value={clipboardText}
                onChange={(event) => setClipboardText(event.target.value)}
                placeholder="Text aus einer E-Mail hier einsetzen..."
                className="min-h-40 resize-y bg-[var(--background)]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClipboardPanelOpen(false);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Abbrechen
                </Button>
                <Button type="button" onClick={createFromClipboardText} disabled={busy || !clipboardText.trim()}>
                  {busy ? <Loader2 className="animate-spin" /> : <Check />}
                  Analysieren
                </Button>
              </div>
            </div>
          ) : selected && analysis ? (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ContactChoice
                  proposal={analysis.proposal.contact}
                  matches={analysis.matches.contacts}
                  choice={contactChoice}
                  onChoice={setContactChoice}
                  enabled={includeContact}
                  onEnabledChange={setIncludeContact}
                />
                <BusinessPartnerChoice
                  proposal={analysis.proposal.business_partner}
                  matches={analysis.matches.business_partners}
                  choice={gpChoice}
                  onChoice={setGpChoice}
                  enabled={includeGp}
                  onEnabledChange={setIncludeGp}
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={ignoreSelected}
                  disabled={busy}
                  title="Ohne Übernahme als erledigt markieren"
                >
                  Verwerfen
                </Button>
                <Button type="button" onClick={accept} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Check />}
                  Übernehmen
                </Button>
              </div>
            </div>
          ) : selected && !analysis ? (
            <div className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
              Keine Analyse vorhanden. {selected.error}
            </div>
          ) : (
            <div className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
              Wähle einen Ingest aus der Liste.
            </div>
          )}
          {error && <div className="mt-3 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
