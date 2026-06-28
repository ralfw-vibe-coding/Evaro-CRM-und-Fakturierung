import * as React from "react";
import {
  Copy,
  FileText,
  Filter,
  Hash,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppSettings, BusinessPartner, Invoice, InvoiceData, InvoiceLine, InvoiceStatus } from "@/domain/model";
import {
  billInvoiceRpu,
  changeInvoiceStatusRpu,
  createInvoiceDraftRpu,
  deleteInvoiceDraftRpu,
  invoiceStore,
  loadAppSettingsRpu,
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

const EMPTY_APP_SETTINGS: AppSettings = { invoicing: {}, updated_at: null };

export function InvoicingArea() {
  const [data, setData] = React.useState(invoiceStore.get());
  const [loading, setLoading] = React.useState(!invoiceStore.get());
  const [selectedId, setSelectedId] = React.useState<string | null>(invoiceStore.getSelectedInvoiceId());
  const [searchTerm, setSearchTerm] = React.useState(invoiceStore.getSearchTerm());
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createFilter, setCreateFilter] = React.useState("");
  const [busyCreate, setBusyCreate] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus[]>(["draft", "billed", "paid"]);

  React.useEffect(() => {
    let cancelled = false;
    loadInvoicingDataRpu().then((result) => {
      if (cancelled) return;
      setLoading(false);
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
  const businessPartners = data?.business_partners ?? [];
  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null;
  const filtered = filterInvoices(invoices, searchTerm, statusFilter);

  return (
    <div
      className="grid h-full divide-x divide-[var(--border)]"
      style={{ gridTemplateColumns: "260px minmax(360px,0.55fr) minmax(560px,1fr)" }}
    >
      <Column icon={<Filter className="size-4" />} title="Filter">
        <div className="grid gap-4">
          <SearchField value={searchTerm} onChange={changeSearch} />
          <InvoiceStatusFilter
            invoices={invoices}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
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
          <InvoiceList loading={loading} invoices={filtered} selectedId={selectedId} onSelect={selectInvoice} />
        </div>
      </Column>

      <section className="h-full min-h-0 overflow-auto">
        <InvoiceDetail
          invoice={selected}
          allInvoices={invoices}
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

function InvoiceStatusFilter({
  invoices,
  selected,
  onChange,
}: {
  invoices: Invoice[];
  selected: InvoiceStatus[];
  onChange: (statuses: InvoiceStatus[]) => void;
}) {
  const statuses: { id: InvoiceStatus; label: string }[] = [
    { id: "draft", label: "Entwurf" },
    { id: "billed", label: "Abgerechnet" },
    { id: "paid", label: "Bezahlt" },
  ];
  const counts = statuses.reduce<Record<InvoiceStatus, number>>(
    (result, status) => {
      result[status.id] = invoices.filter((invoice) => invoice.status === status.id).length;
      return result;
    },
    { draft: 0, billed: 0, paid: 0 },
  );

  function toggle(status: InvoiceStatus) {
    const active = selected.includes(status);
    const next = active ? selected.filter((item) => item !== status) : [...selected, status];
    onChange(next.length === 0 ? statuses.map((item) => item.id) : next);
  }

  return (
    <div className="flex items-center gap-2">
      {statuses.map((status) => {
        const active = selected.includes(status.id);
        return (
          <button
            key={status.id}
            type="button"
            onClick={() => toggle(status.id)}
            aria-label={`${status.label} anzeigen`}
            title={status.label}
            className={cn(
              "grid h-9 min-w-9 place-items-center rounded-full border px-3 text-sm font-semibold transition-colors",
              active
                ? statusTone(status.id, true)
                : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
            )}
          >
            {counts[status.id]}
          </button>
        );
      })}
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
  loading,
  invoices,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid h-full place-items-center text-[var(--muted-foreground)]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
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
  onChanged,
  onError,
}: {
  invoice: Invoice | null;
  allInvoices: Invoice[];
  onChanged: () => void;
  onError: (error: string | null) => void;
}) {
  const [draft, setDraft] = React.useState<InvoiceData>({ lines: [] });
  const [vatRate, setVatRate] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [billing, setBilling] = React.useState(false);
  const [draftResetArmed, setDraftResetArmed] = React.useState(false);
  const [deleteInvoiceArmed, setDeleteInvoiceArmed] = React.useState(false);
  const [loadingPrint, setLoadingPrint] = React.useState(false);
  const [printInvoice, setPrintInvoice] = React.useState<Invoice | null>(null);
  const [printSettings, setPrintSettings] = React.useState<AppSettings>(EMPTY_APP_SETTINGS);
  const [savedInfo, setSavedInfo] = React.useState<string | null>(null);
  const [deleteLineId, setDeleteLineId] = React.useState<string | null>(null);
  const [focusLineId, setFocusLineId] = React.useState<string | null>(null);
  const lineDateRefs = React.useRef(new Map<string, HTMLInputElement>());

  React.useEffect(() => {
    setDraft(structuredClone(invoice?.data ?? { lines: [] }));
    setVatRate(invoice?.vat_rate ?? 0);
    setSavedInfo(null);
    setDeleteLineId(null);
    setFocusLineId(null);
    setDraftResetArmed(false);
    setDeleteInvoiceArmed(false);
  }, [invoice?.id]);

  React.useEffect(() => {
    if (!focusLineId) return;
    const input = lineDateRefs.current.get(focusLineId);
    if (!input) return;
    input.focus();
    setFocusLineId(null);
  }, [draft.lines, focusLineId]);

  React.useEffect(() => {
    if (!draftResetArmed && !deleteInvoiceArmed && !deleteLineId) return;

    function resetConfirmation(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-confirmation-control]")) return;
      setDraftResetArmed(false);
      setDeleteInvoiceArmed(false);
      setDeleteLineId(null);
    }

    document.addEventListener("pointerdown", resetConfirmation, true);
    return () => document.removeEventListener("pointerdown", resetConfirmation, true);
  }, [draftResetArmed, deleteInvoiceArmed, deleteLineId]);

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
  const showReverseChargeNote = draft.reverse_charge === true;
  const canDeleteInvoice = invoice.status === "draft" && !invoice.invoice_number;
  const canPrint = draft.lines.length > 0;

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

  function setReverseCharge(enabled: boolean) {
    setDraft((current) => ({ ...current, reverse_charge: enabled }));
    if (enabled) setVatRate(0);
    setSavedInfo(null);
  }

  function addLine() {
    const id = crypto.randomUUID();
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        { id, quantity: 1, unit_price: 0 },
      ],
    }));
    setFocusLineId(id);
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

  async function saveDraft(): Promise<Invoice | null> {
    const currentInvoice = invoice;
    if (!currentInvoice) return null;
    if (!dirty) return currentInvoice;
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
      return null;
    }
    onError(null);
    setDraft(structuredClone(result.invoice.data));
    setVatRate(result.invoice.vat_rate);
    setSavedInfo(result.conflict ? "Gespeichert, externe Änderung überschrieben" : "Gespeichert");
    onChanged();
    return result.invoice;
  }

  async function save() {
    if (!dirty || saving) return;
    await saveDraft();
  }

  async function bill() {
    if (!invoice || invoice.status !== "draft" || billing || saving) return;
    setBilling(true);
    const savedInvoice = await saveDraft();
    if (!savedInvoice) {
      setBilling(false);
      return;
    }
    const result = await billInvoiceRpu(savedInvoice.id);
    setBilling(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    setDraft(structuredClone(result.invoice.data));
    setVatRate(result.invoice.vat_rate);
    setSavedInfo(null);
    onChanged();
  }

  async function changeStatus(status: Invoice["status"]) {
    if (!invoice || billing || saving) return;
    setBilling(true);
    const result = await changeInvoiceStatusRpu(invoice.id, status);
    setBilling(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    setDraft(structuredClone(result.invoice.data));
    setVatRate(result.invoice.vat_rate);
    setDraftResetArmed(false);
    setSavedInfo(null);
    onChanged();
  }

  async function deleteInvoice() {
    if (!invoice || saving || billing || !canDeleteInvoice) return;
    if (!deleteInvoiceArmed) {
      setDeleteInvoiceArmed(true);
      return;
    }
    setBilling(true);
    const result = await deleteInvoiceDraftRpu(invoice.id);
    setBilling(false);
    if (!result.ok) {
      onError(result.error);
      setDeleteInvoiceArmed(false);
      return;
    }
    onError(null);
    setSavedInfo(null);
    onChanged();
  }

  async function openPrintPreview() {
    if (!invoice || !canPrint || loadingPrint) return;
    setLoadingPrint(true);
    const savedInvoice = await saveDraft();
    if (!savedInvoice) {
      setLoadingPrint(false);
      return;
    }
    const result = await loadAppSettingsRpu();
    setLoadingPrint(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    setPrintSettings(result.settings);
    setPrintInvoice(savedInvoice);
  }

  function requestDraftReset() {
    if (!invoice || invoice.status !== "billed") return;
    if (!draftResetArmed) {
      setDraftResetArmed(true);
      return;
    }
    void changeStatus("draft");
  }

  return (
    <div className="grid gap-6 p-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center font-semibold">
          <StatusFlow
            status={invoice.status}
            busy={billing || saving}
            draftResetArmed={draftResetArmed}
            onBill={bill}
            onPay={() => void changeStatus("paid")}
            onDraft={requestDraftReset}
          />
          {invoice.invoice_number && (
            <div className="ml-4 flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">RgNr.</span>
              <span className="font-mono text-lg font-bold">{invoice.invoice_number}</span>
              {invoice.invoice_date && (
                <span className="text-sm font-normal text-[var(--muted-foreground)]">
                  ({formatDate(invoice.invoice_date)})
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedInfo && <span className="text-xs text-[var(--muted-foreground)]">{savedInfo}</span>}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={!canPrint || loadingPrint}
            aria-label="Rechnung drucken"
            title="Rechnung drucken"
            onClick={openPrintPreview}
          >
            {loadingPrint ? <Loader2 className="animate-spin" /> : <Printer />}
          </Button>
          <Button
            type="button"
            size="icon"
            className={cn(
              dirty && invoice.status === "draft"
                ? "bg-[var(--brand)] text-white hover:opacity-90 disabled:bg-transparent disabled:text-[var(--muted-foreground)] disabled:opacity-30"
                : "border border-transparent bg-transparent text-[var(--muted-foreground)] opacity-30 shadow-none hover:bg-transparent",
            )}
            disabled={!dirty || saving || billing || invoice.status !== "draft"}
            aria-label="Rechnung speichern"
            title="Rechnung speichern"
            onClick={save}
          >
            {saving || billing ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-[var(--foreground)] disabled:bg-transparent disabled:text-[var(--muted-foreground)] disabled:opacity-30"
            disabled={!canDeleteInvoice || saving || billing}
            aria-label="Rechnungsentwurf löschen"
            title={deleteInvoiceArmed ? "Löschen bestätigen" : "Rechnungsentwurf löschen"}
            onClick={deleteInvoice}
            data-confirmation-control
          >
            {deleteInvoiceArmed ? <span className="font-bold">?</span> : <Trash2 />}
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
            <div key={line.id} className="grid gap-3 rounded-md border border-[var(--border)] p-3">
              <div className="grid grid-cols-12 items-start gap-3">
                <Input
                  type="date"
                  ref={(node) => {
                    if (node) lineDateRefs.current.set(line.id, node);
                    else lineDateRefs.current.delete(line.id);
                  }}
                  value={line.service_date ?? ""}
                  aria-label="Leistungsdatum"
                  placeholder="Leistungsdatum"
                  title="Leistungsdatum"
                  className="col-span-2 min-w-0"
                  onChange={(event) => patchLine(line.id, { service_date: event.target.value })}
                  disabled={invoice.status !== "draft"}
                  {...NO_PASSWORD_MANAGER_PROPS}
                />
                <div className="col-span-2 min-w-0">
                  <ChipInput
                    value={line.product_form ?? ""}
                    options={tagOptions.forms}
                    placeholder="Form"
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_form: value })}
                  />
                </div>
                <div className="col-span-3 min-w-0">
                  <ChipInput
                    value={line.product_topic ?? ""}
                    options={tagOptions.topics}
                    placeholder="Thema"
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_topic: value })}
                  />
                </div>
                <textarea
                  value={line.text ?? ""}
                  onChange={(event) => patchLine(line.id, { text: event.target.value })}
                  className="col-span-4 min-h-10 w-full min-w-0 resize-y rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  rows={1}
                  aria-label="Freitext"
                  disabled={invoice.status !== "draft"}
                  {...NO_PASSWORD_MANAGER_PROPS}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1 justify-self-end"
                  tabIndex={-1}
                  aria-label="Position löschen"
                  title={deleteLineId === line.id ? "Löschen bestätigen" : "Position löschen"}
                  onClick={() => removeLine(line.id)}
                  disabled={invoice.status !== "draft"}
                  data-confirmation-control
                >
                  {deleteLineId === line.id ? <span className="font-bold">?</span> : <Trash2 />}
                </Button>
              </div>
              <div className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-4" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  aria-label="Menge"
                  placeholder="Menge"
                  className="col-span-1 min-w-0 text-right"
                  onChange={(event) => patchLine(line.id, { quantity: Number(event.target.value) })}
                  disabled={invoice.status !== "draft"}
                  {...NO_PASSWORD_MANAGER_PROPS}
                />
                <div className="col-span-2 min-w-0">
                  <ChipInput
                    value={line.unit ?? ""}
                    options={tagOptions.units}
                    placeholder="Einheit"
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { unit: value })}
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <MoneyInput
                    value={line.unit_price}
                    aria-label="Preis"
                    placeholder="Preis"
                    onChange={(value) => patchLine(line.id, { unit_price: value })}
                    disabled={invoice.status !== "draft"}
                  />
                </div>
                <div className="col-span-3 min-w-0 text-right font-mono text-sm font-semibold">
                  {formatMoney(lineTotal(line))}
                </div>
              </div>
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
          <div className="grid gap-1">
            <span className="text-sm font-medium">Zahlungsbedingungen</span>
            <div className="grid grid-cols-[9rem_1fr] items-center gap-3">
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.payment_due_days ?? ""}
                onChange={(event) =>
                  patch({
                    payment_due_days: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)),
                    payment_terms: undefined,
                  })
                }
                className="text-right"
                aria-label="Zahlungszeitraum in Tagen"
                placeholder="Tage"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
              <div className="text-sm text-[var(--muted-foreground)]">
                {standardPaymentTermsLine(draft.payment_due_days, invoice.invoice_date, "de")}
              </div>
            </div>
            <textarea
              value={draft.payment_free_text ?? ""}
              onChange={(event) => patch({ payment_free_text: event.target.value, payment_terms: undefined })}
              className="min-h-16 w-full resize-y rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              rows={2}
              placeholder="Freier Text"
              disabled={invoice.status !== "draft"}
              {...NO_PASSWORD_MANAGER_PROPS}
            />
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
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVatRate(next);
                  if (next > 0 && draft.reverse_charge) setReverseCharge(false);
                }}
                className="h-8 w-20 text-right"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
              <span>%</span>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
            <span>Reverse Charge</span>
            <input
              type="checkbox"
              checked={draft.reverse_charge === true}
              onChange={(event) => setReverseCharge(event.target.checked)}
              disabled={invoice.status !== "draft"}
              className="size-4 accent-[var(--brand)]"
            />
          </label>
          <SummaryRow label="USt.-Betrag" value={formatMoney(totals.vat)} />
          <div className="mt-2 border-t border-[var(--border)] pt-3">
            <SummaryRow label="Betrag" value={formatMoney(totals.gross)} strong />
          </div>
          {showReverseChargeNote && (
            <div className="mt-2 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]">
              Steuerschuldnerschaft des Leistungsempfängers (reverse charge)
            </div>
          )}
        </div>
      </section>
      {printInvoice && (
        <InvoicePrintPreview
          invoice={printInvoice}
          settings={printSettings}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}

function InvoicePrintPreview({
  invoice,
  settings,
  onClose,
}: {
  invoice: Invoice;
  settings: AppSettings;
  onClose: () => void;
}) {
  const totals = invoiceTotal(invoice);
  const seller = settings.invoicing;
  const sellerName = seller.company_name?.trim() || "Evaro";
  const sellerAddressLines = splitLines(seller.sender_address);
  const bankLines = splitLines(seller.bank_details);
  const registrationLines = splitLines(seller.company_registration);
  const address = invoice.gp_snapshot.address;
  const buyerLines = [
    invoice.gp_snapshot.name,
    address?.street,
    [address?.zip, address?.city].filter(Boolean).join(" "),
    address?.country,
  ].filter((line): line is string => Boolean(line));
  const invoiceNumber = invoice.invoice_number ?? "0000000000";
  const invoiceDate = invoice.invoice_date ? formatDate(invoice.invoice_date) : "DD.MM.YYYY";
  const reverseCharge = invoice.data.reverse_charge === true;
  const language = invoice.gp_snapshot.invoice_language ?? "de";
  const labels = invoicePrintLabels[language];
  const paymentTerms = paymentTermsText(invoice.data, invoice.invoice_date, language);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-zinc-950/50 p-6">
      <div className="no-print sticky top-0 mx-auto mb-4 flex max-w-[210mm] items-center justify-end gap-2">
        <Button
          type="button"
          size="icon"
          className="bg-[var(--brand)] text-white hover:opacity-90"
          aria-label="Drucken"
          title="Drucken"
          onClick={() => window.print()}
        >
          <Printer />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Schließen" title="Schließen" onClick={onClose}>
          <X />
        </Button>
      </div>

      <article className="invoice-print-surface mx-auto min-h-[297mm] w-[210mm] bg-white px-[18mm] py-[16mm] text-black shadow-2xl">
        <header className="border-b border-zinc-300 pb-3">
          <div className="flex items-baseline justify-between gap-12">
            <div className="text-2xl font-bold">{sellerName}</div>
            <div className="text-right text-2xl font-bold tracking-normal">{invoiceTitle(language, invoiceNumber)}</div>
          </div>
          <div className="mt-1 text-right text-sm text-zinc-600">{invoiceDate}</div>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-12">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{labels.billTo}</div>
            <div className="mt-3 whitespace-pre-line text-sm leading-6">{buyerLines.join("\n")}</div>
            {invoice.gp_snapshot.vat_id && (
              <div className="mt-3 text-sm text-zinc-700">{labels.buyerVatId}: {invoice.gp_snapshot.vat_id}</div>
            )}
            {invoice.data.reference && (
              <div className="mt-1 text-sm text-zinc-700">{labels.customerRef}: {invoice.data.reference}</div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{labels.seller}</div>
            <div className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
              <div className="font-medium text-black">{sellerName}</div>
              {sellerAddressLines.length > 0 && (
                <div className="whitespace-pre-line">{sellerAddressLines.join("\n")}</div>
              )}
              {seller.vat_number && <div>{labels.sellerVatNo}: {seller.vat_number}</div>}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-3 font-bold">{labels.serviceDate}</th>
                <th className="py-2 pr-3 font-bold">{labels.description}</th>
                <th className="py-2 pr-3 text-right font-bold">{labels.qty}</th>
                <th className="py-2 pr-3 font-bold">{labels.unit}</th>
                <th className="py-2 pr-3 text-right font-bold">{labels.unitPrice}</th>
                <th className="py-2 text-right font-bold">{labels.total}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.data.lines.map((line) => (
                <tr key={line.id} className="break-inside-avoid border-b border-zinc-200 align-top">
                  <td className="py-3 pr-3">{line.service_date ? formatDate(line.service_date) : ""}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
                      {line.product_form && <span>{line.product_form}</span>}
                      {line.product_topic && <span>{line.product_topic}</span>}
                    </div>
                    {line.text && <div className="mt-1 whitespace-pre-line text-zinc-700">{line.text}</div>}
                  </td>
                  <td className="py-3 pr-3 text-right">{formatNumber(line.quantity)}</td>
                  <td className="py-3 pr-3">{line.unit ?? ""}</td>
                  <td className="py-3 pr-3 text-right">{formatMoney(line.unit_price)}</td>
                  <td className="py-3 text-right font-medium">{formatMoney(lineTotal(line))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid grid-cols-[1fr_70mm] gap-10">
          <div className="grid content-start gap-6 text-sm">
            {invoice.data.comment && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{labels.comment}</div>
                <div className="mt-2 whitespace-pre-line leading-6">{invoice.data.comment}</div>
              </div>
            )}
            {paymentTerms && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{labels.paymentTerms}</div>
                <div className="mt-2 whitespace-pre-line leading-6">
                  {paymentTerms}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-2 border-t border-zinc-300 pt-3 text-sm">
            <PrintTotal label={labels.net} value={formatMoney(totals.net)} />
            <PrintTotal label={`${labels.vat} (${formatNumber(invoice.vat_rate)}%)`} value={formatMoney(totals.vat)} />
            <div className="mt-2 border-t border-zinc-300 pt-3">
              <PrintTotal label={labels.amountDue} value={formatMoney(totals.gross)} strong />
            </div>
          </div>
        </section>

        {reverseCharge && (
          <div className="mt-6 break-inside-avoid border-t border-zinc-300 pt-4 text-sm">
            {labels.reverseCharge}
          </div>
        )}

        <footer className="mt-12 grid break-inside-avoid grid-cols-3 gap-6 border-t border-zinc-300 pt-5 text-xs leading-5 text-zinc-600">
          <div>
            <div className="font-bold text-zinc-800">{labels.registration}</div>
            <div className="mt-1 whitespace-pre-line">{registrationLines.join("\n")}</div>
          </div>
          <div>
            <div className="font-bold text-zinc-800">{labels.bank}</div>
            <div className="mt-1 whitespace-pre-line">{bankLines.join("\n")}</div>
          </div>
          <div>
            <div className="font-bold text-zinc-800">{labels.contact}</div>
            <div className="mt-1 whitespace-pre-line">
              {[seller.contact_person, seller.email, seller.phone, seller.website].filter(Boolean).join("\n")}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function PrintTotal({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-6", strong && "text-base font-bold")}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

type InvoicePrintLanguage = "de" | "en";

const invoicePrintLabels: Record<InvoicePrintLanguage, Record<string, string>> = {
  de: {
    invoiceNo: "Rechnung Nr.",
    billTo: "Rechnung an",
    buyerVatId: "USt-ID",
    customerRef: "Kundenreferenz",
    seller: "Rechnungssteller",
    sellerVatNo: "USt-Nr.",
    serviceDate: "Leistungsdatum",
    description: "Beschreibung",
    qty: "Menge",
    unit: "Einheit",
    unitPrice: "Einzelpreis",
    total: "Gesamt",
    comment: "Kommentar",
    paymentTerms: "Zahlungsbedingungen",
    net: "Netto",
    vat: "USt.",
    amountDue: "Rechnungsbetrag",
    reverseCharge: "Steuerschuldnerschaft des Leistungsempfängers (reverse charge).",
    registration: "Registrierung",
    bank: "Bank",
    contact: "Kontakt",
    paymentDueLine: "Der Rechnungsbetrag ist ohne Abzug zahlbar bis:",
  },
  en: {
    invoiceNo: "Invoice #",
    billTo: "Bill To",
    buyerVatId: "VAT ID",
    customerRef: "Customer Ref.",
    seller: "Seller",
    sellerVatNo: "VAT No.",
    serviceDate: "Service Date",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    total: "Total",
    comment: "Comment",
    paymentTerms: "Payment Terms",
    net: "Net",
    vat: "VAT",
    amountDue: "Amount Due",
    reverseCharge: "Tax liability of the recipient of the service (reverse charge).",
    registration: "Registration",
    bank: "Bank",
    contact: "Contact",
    paymentDueLine: "The invoice amount is payable without deduction by:",
  },
};

function invoiceTitle(language: InvoicePrintLanguage, invoiceNumber: string): string {
  return language === "en" ? `Invoice #${invoiceNumber}` : `Rechnung Nr. ${invoiceNumber}`;
}

function ReadOnlySnapshot({ invoice }: { invoice: Invoice }) {
  const address = invoice.gp_snapshot.address;
  const cityLine = [address?.zip, address?.city].filter(Boolean).join(" ");
  const language = (invoice.gp_snapshot.invoice_language ?? "de").toUpperCase();
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <div className="font-semibold">{invoice.gp_snapshot.name}</div>
      {address?.street && <div className="mt-2 text-sm">{address.street}</div>}
      {cityLine && <div className="text-sm">{cityLine}</div>}
      {address?.country && <div className="text-sm">{address.country}</div>}
      <div className="mt-3 grid gap-1 text-sm text-[var(--muted-foreground)]">
        {invoice.gp_snapshot.vat_id && <span>USt-ID: {invoice.gp_snapshot.vat_id} ({language})</span>}
        {invoice.gp_snapshot.email && (
          <span className="flex items-center gap-1.5">
            <span>{invoice.gp_snapshot.email}</span>
            <button
              type="button"
              className="grid size-6 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              aria-label="E-Mail kopieren"
              title="E-Mail kopieren"
              onClick={() => void navigator.clipboard?.writeText(invoice.gp_snapshot.email ?? "")}
            >
              <Copy className="size-3.5" />
            </button>
          </span>
        )}
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
  placeholder,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [focused, setFocused] = React.useState(false);
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            disabled={disabled}
            aria-label={placeholder}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            {...NO_PASSWORD_MANAGER_PROPS}
          />
        )}
      </div>
      {!disabled && !normalized && focused && (suggestions.length > 0 || draft.trim()) && (
        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-md border border-[var(--border)] bg-white shadow-xl">
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
          {draft.trim() && (
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
          )}
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  value,
  disabled,
  placeholder,
  "aria-label": ariaLabel,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  placeholder?: string;
  "aria-label": string;
  onChange: (value: number) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    if (!focused) setDraft(formatMoney(value));
  }, [focused, value]);

  function parseMoney(input: string): number {
    const normalized = input
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={focused ? draft : formatMoney(value)}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className="text-right font-mono"
      disabled={disabled}
      onFocus={() => {
        setFocused(true);
        setDraft(value ? String(value).replace(".", ",") : "");
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseMoney(event.target.value));
      }}
      onBlur={() => setFocused(false)}
      {...NO_PASSWORD_MANAGER_PROPS}
    />
  );
}

function StatusChip({ status }: { status: Invoice["status"] }) {
  const label = status === "draft" ? "Entwurf" : status === "billed" ? "Abgerechnet" : "Bezahlt";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", statusTone(status, true))}>
      {label}
    </span>
  );
}

function StatusFlow({
  status,
  busy,
  draftResetArmed,
  onBill,
  onPay,
  onDraft,
}: {
  status: Invoice["status"];
  busy: boolean;
  draftResetArmed: boolean;
  onBill: () => void;
  onPay: () => void;
  onDraft: () => void;
}) {
  const steps: { id: Invoice["status"]; label: string }[] = [
    { id: "draft", label: "Entwurf" },
    { id: "billed", label: "Abgerechnet" },
    { id: "paid", label: "Bezahlt" },
  ];

  return (
    <div className="ml-2 flex items-center text-xs font-semibold">
      {steps.map((step, index) => {
        const active = step.id === status;
        const canBill = status === "draft" && step.id === "billed";
        const canPay = status === "billed" && step.id === "paid";
        const canReturnToDraft = status === "billed" && step.id === "draft";
        const className = cn(
          "relative inline-flex h-8 min-w-[6.75rem] items-center justify-center px-4 pl-5",
          index > 0 && "-ml-2 pl-6",
          (canBill || canPay || canReturnToDraft) && "z-10 cursor-pointer disabled:cursor-wait",
          statusTone(step.id, active),
          canBill && "hover:bg-amber-400 hover:text-amber-950",
          canPay && "hover:bg-emerald-500 hover:text-white",
          canReturnToDraft && "hover:bg-zinc-500 hover:text-white",
        );
        const style = {
          clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)",
        };
        if (canBill) {
          return (
            <button
              key={step.id}
              type="button"
              className={className}
              style={style}
              disabled={busy}
              title="Rechnung abrechnen"
              onClick={onBill}
            >
              {step.label}
            </button>
          );
        }
        if (canPay || canReturnToDraft) {
          return (
            <button
              key={step.id}
              type="button"
              className={className}
              style={style}
              disabled={busy}
              title={canPay ? "Rechnung als bezahlt markieren" : "Zurück zu Entwurf"}
              onClick={canPay ? onPay : onDraft}
              data-confirmation-control={canReturnToDraft ? true : undefined}
            >
              {canReturnToDraft && draftResetArmed ? (
                <>
                  <span className="invisible">{step.label}</span>
                  <span className="absolute left-1/2 -translate-x-1/2 text-base font-bold">?</span>
                </>
              ) : (
                step.label
              )}
            </button>
          );
        }
        return (
          <span
            key={step.id}
            className={className}
            style={style}
          >
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

function statusTone(status: Invoice["status"], active: boolean): string {
  if (status === "paid") {
    return active ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700";
  }
  if (status === "billed") {
    return active ? "bg-amber-400 text-amber-950" : "bg-amber-50 text-amber-700";
  }
  return active ? "bg-zinc-500 text-white" : "bg-zinc-100 text-zinc-600";
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 text-sm", strong && "text-base font-semibold")}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function filterInvoices(
  invoices: Invoice[],
  searchTerm: string,
  statuses: InvoiceStatus[],
): Invoice[] {
  const term = searchTerm.trim().toLowerCase();
  return invoices.filter((invoice) => {
    if (!statuses.includes(invoice.status)) return false;
    if (!term) return true;
    return [invoice.invoice_number, invoice.gp_snapshot.name, invoice.data.reference]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

function splitLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function standardPaymentTermsLine(
  days: number | undefined,
  invoiceDate: string | null,
  language: InvoicePrintLanguage,
): string {
  const prefix = invoicePrintLabels[language].paymentDueLine;
  if (days === undefined) return `${prefix} -`;
  const base = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
  return `${prefix} ${formatOffsetDate(base, days)}`;
}

function paymentTermsText(data: InvoiceData, invoiceDate: string | null, language: InvoicePrintLanguage): string {
  const parts = [
    data.payment_due_days !== undefined ? standardPaymentTermsLine(data.payment_due_days, invoiceDate, language) : undefined,
    data.payment_free_text?.trim(),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join("\n");
  return previewPaymentTerms(data.payment_terms, invoiceDate);
}

function previewPaymentTerms(template: string | undefined, invoiceDate: string | null): string {
  const text = template?.trim();
  if (!text) return "";
  const base = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
  return text
    .replace(/\{(\d+)\}/g, (_, days: string) => formatOffsetDate(base, Number(days)))
    .replace(
      /\{(?:rgdatum|rechnungsdatum|rgd|invdate)(?:\s*\+\s*(\d+))?\}/gi,
      (_, days: string | undefined) => formatOffsetDate(base, Number(days ?? 0)),
    );
}

function formatOffsetDate(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return formatDate(date.toISOString().slice(0, 10));
}
