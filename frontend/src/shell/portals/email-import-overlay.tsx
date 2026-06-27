import * as React from "react";
import { Building2, ClipboardPaste, Loader2, User, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeEmailImportRpu,
  createBusinessPartnerRpu,
  createContactRpu,
  linkContactGpRpu,
} from "@/composition";
import type { BusinessPartner, BusinessPartnerData, Contact, ContactData } from "@/domain/model";
import type { EmailImportAnalysis, EmailImportMatch } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";

type Choice = "new" | string;

function StepChip({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
          : "border-[var(--border)] text-[var(--muted-foreground)]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

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
}: {
  proposal: ContactData;
  matches: Array<EmailImportMatch<Contact>>;
  choice: Choice;
  onChoice: (choice: Choice) => void;
}) {
  return (
    <section className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex min-h-7 items-center gap-2 border-b border-[var(--border)] bg-[var(--accent)] px-3 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        <User className="size-3.5 text-[var(--brand)]" />
        Kontakt
      </div>
      <div className="grid gap-2 p-3">
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
}: {
  proposal: BusinessPartnerData;
  matches: Array<EmailImportMatch<BusinessPartner>>;
  choice: Choice;
  onChoice: (choice: Choice) => void;
}) {
  const address = proposal.address;
  return (
    <section className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex min-h-7 items-center gap-2 border-b border-[var(--border)] bg-[var(--accent)] px-3 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        <Building2 className="size-3.5 text-[var(--gp)]" />
        Geschäftspartner
      </div>
      <div className="grid gap-2 p-3">
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
}: {
  onClose: () => void;
  onChanged: () => void;
  onNavigate: (ref: EntityRef) => void;
}) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState<EmailImportAnalysis | null>(null);
  const [contactChoice, setContactChoice] = React.useState<Choice>("new");
  const [gpChoice, setGpChoice] = React.useState<Choice>("new");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function pasteClipboard() {
    setError(null);
    try {
      const value = await navigator.clipboard.readText();
      setText(value);
    } catch {
      setError("Die Zwischenablage konnte nicht gelesen werden. Du kannst den Text einfach einfügen.");
    }
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    const result = await analyzeEmailImportRpu(text);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAnalysis(result.analysis);
    setContactChoice(result.analysis.matches.contacts[0]?.entity.id ?? "new");
    setGpChoice(result.analysis.matches.business_partners[0]?.entity.id ?? "new");
    setStep(2);
  }

  async function resolveContact(): Promise<Contact | null> {
    if (!analysis) return null;
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
    if (!analysis) return null;
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
    if (!analysis) return;
    setBusy(true);
    setError(null);
    const contact = await resolveContact();
    const businessPartner = contact ? await resolveBusinessPartner() : null;
    if (!contact || !businessPartner) {
      setBusy(false);
      return;
    }
    const link = await linkContactGpRpu({
      contact_id: contact.id,
      gp_id: businessPartner.id,
      role: "",
      primary: false,
    });
    setBusy(false);
    if (!link.ok) {
      setError(link.error);
      return;
    }
    onChanged();
    onClose();
    onNavigate({ kind: "contact", id: contact.id });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4">
      <div className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <ClipboardPaste className="size-4 text-[var(--brand)]" />
            <div className="font-semibold">E-Mail übernehmen</div>
            <div className="flex items-center gap-1.5">
              <StepChip active={step === 1}>1. Text einsetzen</StepChip>
              <StepChip active={step === 2}>2. Analyse übernehmen</StepChip>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={pasteClipboard}
              aria-label="Text aus Zwischenablage einsetzen"
              title="Text aus Zwischenablage einsetzen"
            >
              <ClipboardPaste />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
              <X />
            </Button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto p-4">
          {step === 1 && (
            <div className="grid gap-3">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="E-Mail-Text hier einfügen..."
                className="min-h-[42vh] resize-y"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <div />
                <Button type="button" onClick={analyze} disabled={busy || text.trim().length < 20}>
                  {busy ? <Loader2 className="animate-spin" /> : <WandSparkles />}
                  Analysieren
                </Button>
              </div>
            </div>
          )}
          {step === 2 && analysis && (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ContactChoice
                  proposal={analysis.proposal.contact}
                  matches={analysis.matches.contacts}
                  choice={contactChoice}
                  onChoice={setContactChoice}
                />
                <BusinessPartnerChoice
                  proposal={analysis.proposal.business_partner}
                  matches={analysis.matches.business_partners}
                  choice={gpChoice}
                  onChoice={setGpChoice}
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>
                  Zurück
                </Button>
                <Button type="button" onClick={accept} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  Übernehmen
                </Button>
              </div>
            </div>
          )}
          {error && <div className="mt-3 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}
