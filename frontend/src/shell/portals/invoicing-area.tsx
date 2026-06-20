import * as React from "react";
import {
  Check,
  FileText,
  Filter,
  Hash,
  Loader2,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BusinessPartner, Invoice, InvoiceData, InvoiceLine, PaymentTerm } from "@/domain/model";
import {
  createInvoiceDraftRpu,
  createPaymentTermRpu,
  invoiceStore,
  loadInvoicingDataRpu,
  updateInvoiceDraftRpu,
} from "@/composition";

const NO_PASSWORD_MANAGER_PROPS = {
  autoComplete: "new-password",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

export function InvoicingArea() {
  const [data, setData] = React.useState(invoiceStore.get());
  const [selectedId, setSelectedId] = React.useState<string | null>(invoiceStore.getSelectedInvoiceId());
  const [searchTerm, setSearchTerm] = React.useState(invoiceStore.getSearchTerm());
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createFilter, setCreateFilter] = React.useState("");
  const [busyCreate, setBusyCreate] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadInvoicingDataRpu().then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(result.error);
      setData(invoiceStore.get());
      setSelectedId(invoiceStore.getSelectedInvoiceId());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function refresh() {
    setData(invoiceStore.get());
    setSelectedId(invoiceStore.getSelectedInvoiceId());
  }

  function changeSearch(term: string) {
    invoiceStore.setSearchTerm(term);
    setSearchTerm(term);
  }

  function selectInvoice(id: string) {
    invoiceStore.setSelectedInvoiceId(id);
    setSelectedId(id);
  }

  async function createDraft(bp: BusinessPartner) {
    if (busyCreate) return;
    setBusyCreate(true);
    const result = await createInvoiceDraftRpu(bp.id);
    setBusyCreate(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setCreating(false);
    setCreateFilter("");
    refresh();
  }

  const invoices = data?.invoices ?? [];
  const paymentTerms = data?.payment_terms ?? [];
  const businessPartners = data?.business_partners ?? [];
  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null;
  const filtered = filterInvoices(invoices, searchTerm);

  return (
    <div
      className="grid h-full divide-x divide-[var(--border)]"
      style={{ gridTemplateColumns: "260px minmax(360px,0.55fr) minmax(560px,1fr)" }}
    >
      <Column icon={<Filter className="size-4" />} title="Filter">
        <SearchField value={searchTerm} onChange={changeSearch} />
      </Column>

      <Column
        icon={<Receipt className="size-4" />}
        title="Übersicht"
        action={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="bg-[var(--brand)] text-white hover:opacity-90"
            aria-label="Rechnungsentwurf anlegen"
            title="Rechnungsentwurf anlegen"
            onClick={() => setCreating((open) => !open)}
          >
            {creating ? <X /> : <Plus />}
          </Button>
        }
      >
        <div className="grid gap-3">
          {creating && (
            <BusinessPartnerPicker
              businessPartners={businessPartners}
              filter={createFilter}
              busy={busyCreate}
              onFilter={setCreateFilter}
              onPick={createDraft}
            />
          )}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <InvoiceList invoices={filtered} selectedId={selectedId} onSelect={selectInvoice} />
        </div>
      </Column>

      <section className="h-full min-h-0 overflow-auto">
        <InvoiceDetail
          invoice={selected}
          allInvoices={invoices}
          paymentTerms={paymentTerms}
          onChanged={refresh}
          onError={setError}
        />
      </section>
    </div>
  );
}

function Column({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex h-[68px] items-center justify-between border-b border-[var(--border)] px-5">
        <div className="flex items-center gap-2 font-semibold">
          {icon}
          <span>{title}</span>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
    </section>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (term: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Suchen..."
        className="pl-8 pr-8"
        {...NO_PASSWORD_MANAGER_PROPS}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          aria-label="Suche löschen"
          title="Suche löschen"
          onClick={() => onChange("")}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function BusinessPartnerPicker({
  businessPartners,
  filter,
  busy,
  onFilter,
  onPick,
}: {
  businessPartners: BusinessPartner[];
  filter: string;
  busy: boolean;
  onFilter: (term: string) => void;
  onPick: (bp: BusinessPartner) => void;
}) {
  const matches = businessPartners
    .filter((bp) => bp.data.name.toLowerCase().includes(filter.trim().toLowerCase()))
    .slice(0, 5);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <SearchField value={filter} onChange={onFilter} />
      <div className="mt-2 max-h-56 overflow-auto">
        {matches.map((bp) => (
          <button
            key={bp.id}
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--accent)]"
            onClick={() => onPick(bp)}
            disabled={busy}
          >
            <span className="truncate font-medium">{bp.data.name}</span>
            {busy && <Loader2 className="size-4 animate-spin" />}
          </button>
        ))}
        {matches.length === 0 && (
          <div className="px-2 py-3 text-sm text-[var(--muted-foreground)]">Kein Geschäftspartner gefunden</div>
        )}
      </div>
    </div>
  );
}

function InvoiceList({
  invoices,
  selectedId,
  onSelect,
}: {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (invoices.length === 0) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-[var(--border)] px-4 py-12 text-sm text-[var(--muted-foreground)]">
        Keine Rechnungen
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {invoices.map((invoice) => {
        const total = invoiceTotal(invoice);
        return (
          <button
            key={invoice.id}
            type="button"
            className={cn(
              "rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]",
              selectedId === invoice.id && "border-[var(--brand)] bg-[var(--accent)]",
            )}
            onClick={() => onSelect(invoice.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Hash className="size-3.5" />
                  <span>{invoice.invoice_number ?? "Entwurf"}</span>
                </div>
                <div className="truncate font-semibold">{invoice.gp_snapshot.name}</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {invoice.invoice_date ? formatDate(invoice.invoice_date) : "ohne Rechnungsdatum"}
                </div>
              </div>
              <div className="text-right">
                <StatusChip status={invoice.status} />
                <div className="mt-2 font-mono text-sm">{formatMoney(total.gross)}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function InvoiceDetail({
  invoice,
  allInvoices,
  paymentTerms,
  onChanged,
  onError,
}: {
  invoice: Invoice | null;
  allInvoices: Invoice[];
  paymentTerms: PaymentTerm[];
  onChanged: () => void;
  onError: (error: string | null) => void;
}) {
  const [draft, setDraft] = React.useState<InvoiceData>({ lines: [] });
  const [vatRate, setVatRate] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [savedInfo, setSavedInfo] = React.useState<string | null>(null);
  const [deleteLineId, setDeleteLineId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(structuredClone(invoice?.data ?? { lines: [] }));
    setVatRate(invoice?.vat_rate ?? 0);
    setSavedInfo(null);
    setDeleteLineId(null);
  }, [invoice?.id]);

  if (!invoice) {
    return (
      <div className="grid h-full place-items-center p-8 text-sm text-[var(--muted-foreground)]">
        <div className="flex flex-col items-center gap-2">
          <FileText className="size-8" />
          <span>Rechnung auswählen</span>
        </div>
      </div>
    );
  }

  const dirty = JSON.stringify({ data: draft, vat_rate: vatRate }) !== JSON.stringify({ data: invoice.data, vat_rate: invoice.vat_rate });
  const totals = invoiceTotal({ ...invoice, data: draft, vat_rate: vatRate });
  const tagOptions = getInvoiceTagOptions(allInvoices);

  function patch(next: Partial<InvoiceData>) {
    setDraft((current) => ({ ...current, ...next }));
    setSavedInfo(null);
  }

  function patchLine(id: string, next: Partial<InvoiceLine>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, ...next } : line)),
    }));
    setSavedInfo(null);
  }

  function addLine() {
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        { id: crypto.randomUUID(), quantity: 1, unit_price: 0 },
      ],
    }));
    setSavedInfo(null);
  }

  function removeLine(id: string) {
    if (deleteLineId !== id) {
      setDeleteLineId(id);
      return;
    }
    setDraft((current) => ({ ...current, lines: current.lines.filter((line) => line.id !== id) }));
    setDeleteLineId(null);
    setSavedInfo(null);
  }

  async function save() {
    const currentInvoice = invoice;
    if (!currentInvoice || !dirty || saving) return;
    setSaving(true);
    const result = await updateInvoiceDraftRpu({
      id: currentInvoice.id,
      data: draft,
      vat_rate: vatRate,
      expected_updated_at: currentInvoice.updated_at,
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    setSavedInfo(result.conflict ? "Gespeichert, externe Änderung überschrieben" : "Gespeichert");
    onChanged();
  }

  async function savePaymentTerm() {
    const template = draft.payment_terms?.trim();
    if (!template) return;
    const result = await createPaymentTermRpu({ label: template.slice(0, 80), template });
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    onChanged();
    setSavedInfo("Zahlungsbedingung gespeichert");
  }

  return (
    <div className="grid gap-6 p-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 font-semibold">
          <Receipt className="size-5 text-[var(--brand)]" />
          <span>{invoice.invoice_number ?? "Entwurf"}</span>
          <StatusChip status={invoice.status} />
        </div>
        <div className="flex items-center gap-2">
          {savedInfo && <span className="text-xs text-[var(--muted-foreground)]">{savedInfo}</span>}
          <Button
            type="button"
            size="icon"
            className="bg-[var(--brand)] text-white hover:opacity-90"
            disabled={!dirty || saving || invoice.status !== "draft"}
            aria-label="Rechnung speichern"
            title="Rechnung speichern"
            onClick={save}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
        </div>
      </div>

      <section className="grid gap-4">
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <ReadOnlySnapshot invoice={invoice} />
          <div className="grid content-start gap-4">
            <Field label="Referenz">
              <Input
                value={draft.reference ?? ""}
                onChange={(event) => patch({ reference: event.target.value })}
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
            </Field>
            <Field label="Kommentar">
              <Input
                value={draft.comment ?? ""}
                onChange={(event) => patch({ comment: event.target.value })}
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <h3 className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">Positionen</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Position hinzufügen"
            title="Position hinzufügen"
            onClick={addLine}
            disabled={invoice.status !== "draft"}
          >
            <Plus />
          </Button>
        </div>
        <div className="grid gap-3">
          {draft.lines.map((line) => (
            <div key={line.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="grid grid-cols-[130px_1fr_1fr_90px_100px_110px_96px_36px] items-end gap-2">
                <Field label="Leistung">
                  <Input
                    type="date"
                    value={line.service_date ?? ""}
                    onChange={(event) => patchLine(line.id, { service_date: event.target.value })}
                    disabled={invoice.status !== "draft"}
                    {...NO_PASSWORD_MANAGER_PROPS}
                  />
                </Field>
                <Field label="Form">
                  <ChipInput
                    value={line.product_form ?? ""}
                    options={tagOptions.forms}
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_form: value })}
                  />
                </Field>
                <Field label="Thema">
                  <ChipInput
                    value={line.product_topic ?? ""}
                    options={tagOptions.topics}
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_topic: value })}
                  />
                </Field>
                <Field label="Menge">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) => patchLine(line.id, { quantity: Number(event.target.value) })}
                    disabled={invoice.status !== "draft"}
                    {...NO_PASSWORD_MANAGER_PROPS}
                  />
                </Field>
                <Field label="Einheit">
                  <ChipInput
                    value={line.unit ?? ""}
                    options={tagOptions.units}
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { unit: value })}
                  />
                </Field>
                <Field label="Preis">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(event) => patchLine(line.id, { unit_price: Number(event.target.value) })}
                    disabled={invoice.status !== "draft"}
                    {...NO_PASSWORD_MANAGER_PROPS}
                  />
                </Field>
                <div className="pb-2 text-right font-mono text-sm">{formatMoney(lineTotal(line))}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Position löschen"
                  title={deleteLineId === line.id ? "Löschen bestätigen" : "Position löschen"}
                  onClick={() => removeLine(line.id)}
                  disabled={invoice.status !== "draft"}
                >
                  {deleteLineId === line.id ? <span className="font-bold">?</span> : <Trash2 />}
                </Button>
              </div>
              <textarea
                value={line.text ?? ""}
                onChange={(event) => patchLine(line.id, { text: event.target.value })}
                className="mt-3 min-h-16 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="Freitext"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
            </div>
          ))}
          {draft.lines.length === 0 && (
            <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              Keine Positionen
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-[1fr_320px] gap-6 border-t border-[var(--border)] pt-5">
        <div className="grid content-start gap-3">
          <Field label="Zahlungsbedingungen">
            <select
              value=""
              onChange={(event) => {
                const term = paymentTerms.find((item) => item.id === event.target.value);
                if (term) patch({ payment_terms: term.template });
              }}
              className="h-10 rounded-md border border-[var(--input)] bg-transparent px-3 text-sm"
              disabled={invoice.status !== "draft"}
            >
              <option value="">Gespeicherte Zahlungsbedingung wählen</option>
              {paymentTerms.map((term) => (
                <option key={term.id} value={term.id}>{term.label}</option>
              ))}
            </select>
          </Field>
          <textarea
            value={draft.payment_terms ?? ""}
            onChange={(event) => patch({ payment_terms: event.target.value })}
            className="min-h-20 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            disabled={invoice.status !== "draft"}
            {...NO_PASSWORD_MANAGER_PROPS}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">
              {previewPaymentTerms(draft.payment_terms, invoice.invoice_date)}
            </span>
            <Button type="button" variant="outline" onClick={savePaymentTerm} disabled={!draft.payment_terms?.trim()}>
              <Check className="size-4" />
              Speichern
            </Button>
          </div>
        </div>
        <div className="grid content-start gap-2 rounded-md border border-[var(--border)] p-4">
          <SummaryRow label="Netto" value={formatMoney(totals.net)} />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>USt.</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatRate}
                onChange={(event) => setVatRate(Number(event.target.value))}
                className="h-8 w-20 text-right"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
              <span>%</span>
            </div>
          </div>
          <SummaryRow label="USt.-Betrag" value={formatMoney(totals.vat)} />
          <div className="mt-2 border-t border-[var(--border)] pt-3">
            <SummaryRow label="Betrag" value={formatMoney(totals.gross)} strong />
          </div>
        </div>
      </section>
    </div>
  );
}

function ReadOnlySnapshot({ invoice }: { invoice: Invoice }) {
  const address = invoice.gp_snapshot.address;
  const cityLine = [address?.zip, address?.city].filter(Boolean).join(" ");
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <div className="font-semibold">{invoice.gp_snapshot.name}</div>
      {address?.street && <div className="mt-2 text-sm">{address.street}</div>}
      {cityLine && <div className="text-sm">{cityLine}</div>}
      {address?.country && <div className="text-sm">{address.country}</div>}
      <div className="mt-3 grid gap-1 text-sm text-[var(--muted-foreground)]">
        {invoice.gp_snapshot.vat_id && <span>USt-ID: {invoice.gp_snapshot.vat_id}</span>}
        {invoice.gp_snapshot.email && <span>{invoice.gp_snapshot.email}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ChipInput({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const normalized = value.trim();
  const typed = draft.trim().toLowerCase();
  const suggestions = options
    .filter((option) => option !== normalized)
    .filter((option) => !typed || option.toLowerCase().includes(typed))
    .slice(0, 5);

  React.useEffect(() => {
    setDraft("");
  }, [value]);

  function commit(next = draft) {
    const clean = next.trim();
    if (!clean) return;
    onChange(clean);
    setDraft("");
  }

  return (
    <div className="relative">
      <div className="flex min-h-10 items-center gap-1 rounded-md border border-[var(--input)] px-2 py-1 focus-within:ring-2 focus-within:ring-[var(--ring)]">
        {normalized && (
          <span className="inline-flex max-w-28 items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-1 text-xs">
            <span className="truncate">{normalized}</span>
            {!disabled && (
              <button type="button" aria-label="Tag entfernen" onClick={() => onChange("")}>
                <X className="size-3" />
              </button>
            )}
          </span>
        )}
        {!normalized && (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            {...NO_PASSWORD_MANAGER_PROPS}
          />
        )}
      </div>
      {!disabled && !normalized && draft && (
        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--popover)] shadow-lg">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"
              onMouseDown={(event) => {
                event.preventDefault();
                commit(option);
              }}
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            onMouseDown={(event) => {
              event.preventDefault();
              commit();
            }}
          >
            Neu: {draft.trim()}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: Invoice["status"] }) {
  const label = status === "draft" ? "Entwurf" : status === "billed" ? "Abgerechnet" : "Bezahlt";
  return <span className="inline-flex rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-medium">{label}</span>;
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 text-sm", strong && "text-base font-semibold")}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function filterInvoices(invoices: Invoice[], searchTerm: string): Invoice[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return invoices;
  return invoices.filter((invoice) =>
    [invoice.invoice_number, invoice.gp_snapshot.name, invoice.data.reference]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)),
  );
}

function getInvoiceTagOptions(invoices: Invoice[]) {
  const forms = new Set<string>();
  const topics = new Set<string>();
  const units = new Set<string>();
  for (const invoice of invoices) {
    for (const line of invoice.data.lines) {
      if (line.product_form) forms.add(line.product_form);
      if (line.product_topic) topics.add(line.product_topic);
      if (line.unit) units.add(line.unit);
    }
  }
  const sort = (items: Set<string>) => [...items].sort((a, b) => a.localeCompare(b, "de"));
  return { forms: sort(forms), topics: sort(topics), units: sort(units) };
}

function lineTotal(line: InvoiceLine): number {
  return Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0);
}

function invoiceTotal(invoice: Invoice) {
  const net = invoice.data.lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const vat = net * (Math.max(0, Number(invoice.vat_rate) || 0) / 100);
  return { net, vat, gross: net + vat };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

function previewPaymentTerms(template: string | undefined, invoiceDate: string | null): string {
  const text = template?.trim();
  if (!text) return "";
  const base = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
  return text.replace(/\{(?:rgdatum|rechnungsdatum|rgd|invdate)(?:\s*\+\s*(\d+))?\}/gi, (_, days: string | undefined) => {
    const date = new Date(base);
    date.setDate(date.getDate() + Number(days ?? 0));
    return formatDate(date.toISOString().slice(0, 10));
  });
}
