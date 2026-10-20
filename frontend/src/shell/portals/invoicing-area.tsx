import * as React from "react";
import {
  Copy,
  CopyPlus,
  Download,
  FileCode2,
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
import type { AppSettings, BusinessPartner, Invoice, InvoiceData, InvoiceLine, InvoiceStatus } from "@/domain/model";
import {
  billInvoiceRpu,
  changeInvoiceStatusRpu,
  copyInvoiceRpu,
  createInvoiceDraftRpu,
  deleteInvoiceDraftRpu,
  getRouteRpu,
  invoiceStore,
  loadAppSettingsRpu,
  loadInvoicingDataRpu,
  setRouteRpu,
  updateInvoiceDraftRpu,
  watchRouteRpu,
} from "@/composition";
import { UnsavedCloseDialog } from "./entity-detail";
import {
  formatDate,
  formatMoney,
  invoiceTotal,
  lineTotal,
  standardPaymentTermsLine,
} from "./invoice-print-format";
import { createInvoicePdfBlob, invoiceFilenameFor } from "./invoice-pdf";
import { INVOICE_UNIT_LABELS } from "@/domain/invoice-units";
import {
  buildInvoiceXml,
  checkXRechnung,
  checkXRechnungBeforeBilling,
  invoiceXmlFilename,
} from "./invoice-xrechnung";

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
  const [closeRequestToken, setCloseRequestToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    loadInvoicingDataRpu().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) setError(result.error);
      setData(invoiceStore.get());
      // Deep link (permalink): the URL decides which invoice is selected.
      const route = getRouteRpu();
      if (route.area === "invoicing") invoiceStore.setSelectedInvoiceId(route.invoiceId);
      setSelectedId(invoiceStore.getSelectedInvoiceId());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Back/forward: mirror URL changes into the selection.
  React.useEffect(
    () =>
      watchRouteRpu((route) => {
        if (route.area !== "invoicing") return;
        invoiceStore.setSelectedInvoiceId(route.invoiceId);
        setSelectedId(route.invoiceId);
      }),
    [],
  );

  function refresh() {
    setData(invoiceStore.get());
    const currentId = invoiceStore.getSelectedInvoiceId();
    setSelectedId(currentId);
    // e.g. after deleting a draft the selection is gone — keep the URL honest.
    setRouteRpu({ area: "invoicing", invoiceId: currentId });
  }

  function changeSearch(term: string) {
    invoiceStore.setSearchTerm(term);
    setSearchTerm(term);
  }

  function selectInvoice(id: string) {
    invoiceStore.setSelectedInvoiceId(id);
    setSelectedId(id);
    setRouteRpu({ area: "invoicing", invoiceId: id });
  }

  function closeDetail() {
    invoiceStore.setSelectedInvoiceId(null);
    setSelectedId(null);
    setRouteRpu({ area: "invoicing", invoiceId: null });
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
      style={{ gridTemplateColumns: "260px minmax(0,1fr)" }}
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

      {selected && (
        <InvoiceOverlay onClose={() => setCloseRequestToken((token) => token + 1)}>
          {error && (
            <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <InvoiceDetail
            invoice={selected}
            allInvoices={invoices}
            onChanged={refresh}
            onCopied={selectInvoice}
            onError={setError}
            onClose={closeDetail}
            closeRequestToken={closeRequestToken}
          />
        </InvoiceOverlay>
      )}
    </div>
  );
}

function InvoiceOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  React.useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="invoice-overlay-backdrop fixed inset-0 z-50 grid place-items-center bg-black/25 p-4">
      <div className="invoice-overlay-panel max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {children}
      </div>
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
  onCopied,
  onError,
  onClose,
  closeRequestToken = 0,
}: {
  invoice: Invoice;
  allInvoices: Invoice[];
  onChanged: () => void;
  onCopied: (invoiceId: string) => void;
  onError: (error: string | null) => void;
  onClose: () => void;
  closeRequestToken?: number;
}) {
  const [draft, setDraft] = React.useState<InvoiceData>({ lines: [] });
  const [vatRate, setVatRate] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [billing, setBilling] = React.useState(false);
  const [draftResetArmed, setDraftResetArmed] = React.useState(false);
  const [deleteInvoiceArmed, setDeleteInvoiceArmed] = React.useState(false);
  const [loadingPrint, setLoadingPrint] = React.useState(false);
  const [copying, setCopying] = React.useState(false);
  const [printInvoice, setPrintInvoice] = React.useState<Invoice | null>(null);
  const [printSettings, setPrintSettings] = React.useState<AppSettings>(EMPTY_APP_SETTINGS);
  const [savedInfo, setSavedInfo] = React.useState<string | null>(null);
  const [billIssues, setBillIssues] = React.useState<string[]>([]);
  const [deleteLineId, setDeleteLineId] = React.useState<string | null>(null);
  const [focusLineId, setFocusLineId] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const lineDateRefs = React.useRef(new Map<string, HTMLInputElement>());
  const lastCloseRequestRef = React.useRef(closeRequestToken);

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

  const dirty = JSON.stringify({ data: draft, vat_rate: vatRate }) !== JSON.stringify({ data: invoice.data, vat_rate: invoice.vat_rate });
  const totals = invoiceTotal({ ...invoice, data: draft, vat_rate: vatRate });
  const tagOptions = getInvoiceTagOptions(allInvoices);
  const showReverseChargeNote = draft.reverse_charge === true;
  const canDeleteInvoice = invoice.status === "draft" && !invoice.invoice_number;
  const canPrint = draft.lines.length > 0;

  function requestClose() {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  React.useEffect(() => {
    if (closeRequestToken === lastCloseRequestRef.current) return;
    lastCloseRequestRef.current = closeRequestToken;
    if (closeRequestToken === 0) return;
    requestClose();
  }, [closeRequestToken, dirty]);

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

    // Zu jeder abgerechneten Rechnung muss sich eine gültige XRechnung erzeugen
    // lassen. Fehlt etwas, bleibt sie Entwurf — später nachbessern hiesse, sie
    // in den Entwurf zurückzuholen und die Rechnungsnummer zu verbrennen.
    const settingsResult = await loadAppSettingsRpu();
    if (!settingsResult.ok) {
      setBilling(false);
      onError(settingsResult.error);
      return;
    }
    const issues = checkXRechnungBeforeBilling(savedInvoice, settingsResult.settings);
    if (issues.length > 0) {
      setBilling(false);
      setBillIssues(issues);
      return;
    }
    setBillIssues([]);

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

  // Kopiert wird die gespeicherte Rechnung, nicht der Bildschirminhalt — ein
  // offener Entwurf wandert deshalb vorher in die Datenbank.
  async function copyInvoice() {
    if (!invoice || copying || saving || billing) return;
    setCopying(true);
    if (dirty && invoice.status === "draft") {
      const savedInvoice = await saveDraft();
      if (!savedInvoice) {
        setCopying(false);
        return;
      }
    }
    const result = await copyInvoiceRpu(invoice.id);
    setCopying(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    setSavedInfo(null);
    onChanged();
    onCopied(result.invoice.id);
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
      {billIssues.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="font-semibold">
            Noch nicht abrechenbar — dazu liesse sich keine gültige XRechnung erzeugen:
          </div>
          <ul className="mt-1 list-disc pl-4">
            {billIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-y-2 border-b border-[var(--border)] bg-[var(--background)] pb-4">
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
            aria-label="Als PDF anzeigen"
            title="Als PDF anzeigen"
            onClick={openPrintPreview}
          >
            {loadingPrint ? <Loader2 className="animate-spin" /> : <FileText />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={copying || saving || billing}
            aria-label="Rechnung kopieren"
            title="Rechnung als neuen Entwurf kopieren"
            onClick={copyInvoice}
          >
            {copying ? <Loader2 className="animate-spin" /> : <CopyPlus />}
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
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Schließen"
            title="Schließen"
            onClick={requestClose}
          >
            <X />
          </Button>
        </div>
      </div>

      <section className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                  title={
                    line.service_date
                      ? "Leistungsdatum"
                      : "Leistungsdatum fehlt — ohne sie lässt sich keine XRechnung erzeugen"
                  }
                  className={cn(
                    "col-span-3 min-w-0",
                    // Die XRechnung verlangt je Position einen Leistungszeitpunkt.
                    invoice.status === "draft" && !line.service_date && "border-[var(--destructive)]",
                  )}
                  onChange={(event) => patchLine(line.id, { service_date: event.target.value })}
                  onFocus={(event) => event.target.select()}
                  disabled={invoice.status !== "draft"}
                  {...NO_PASSWORD_MANAGER_PROPS}
                />
                <div className="col-span-4 min-w-0">
                  <ChipInput
                    value={line.product_form ?? ""}
                    options={tagOptions.forms}
                    placeholder="Form"
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_form: value })}
                  />
                </div>
                <div className="col-span-4 min-w-0">
                  <ChipInput
                    value={line.product_topic ?? ""}
                    options={tagOptions.topics}
                    placeholder="Thema"
                    disabled={invoice.status !== "draft"}
                    onChange={(value) => patchLine(line.id, { product_topic: value })}
                  />
                </div>
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
              <textarea
                value={line.text ?? ""}
                onChange={(event) => patchLine(line.id, { text: event.target.value })}
                className="min-h-10 w-full resize-y rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                rows={1}
                aria-label="Freitext"
                placeholder="Freitext"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
              <div className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  aria-label="Menge"
                  placeholder="Menge"
                  className="col-span-2 min-w-0 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(event) => patchLine(line.id, { quantity: Number(event.target.value) })}
                  onFocus={(event) => event.target.select()}
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

      <section className="grid gap-6 border-t border-[var(--border)] pt-5 sm:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-3">
          <div className="grid gap-1">
            <span className="text-sm font-medium">Zahlungsbedingungen</span>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
              <Input
                type="number"
                min="0"
                max="999"
                step="1"
                value={draft.payment_due_days ?? ""}
                onChange={(event) =>
                  patch({
                    payment_due_days:
                      event.target.value === ""
                        ? undefined
                        : Math.min(999, Math.max(0, Number(event.target.value))),
                    payment_terms: undefined,
                  })
                }
                className="text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Zahlungszeitraum in Tagen"
                placeholder="Tage"
                disabled={invoice.status !== "draft"}
                {...NO_PASSWORD_MANAGER_PROPS}
              />
              <div className="min-w-0 break-words text-sm text-[var(--muted-foreground)]">
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
        <InvoicePdfPreview
          invoice={printInvoice}
          settings={printSettings}
          onClose={() => setPrintInvoice(null)}
        />
      )}
      {confirmClose && (
        <UnsavedCloseDialog
          onCancel={() => setConfirmClose(false)}
          onSaveAndClose={async () => {
            const saved = await saveDraft();
            if (!saved) return;
            setConfirmClose(false);
            onClose();
          }}
          onCloseWithoutSave={() => {
            setConfirmClose(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function InvoicePdfPreview({
  invoice,
  settings,
  onClose,
}: {
  invoice: Invoice;
  settings: AppSettings;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [xmlIssues, setXmlIssues] = React.useState<string[]>([]);
  const blobRef = React.useRef<Blob | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPdfUrl(null);
    setPdfError(null);
    createInvoicePdfBlob(invoice, settings)
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        setPdfError(error instanceof Error ? error.message : "PDF konnte nicht erzeugt werden.");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [invoice, settings]);

  function downloadPdf() {
    if (!blobRef.current) return;
    const link = document.createElement("a");
    link.href = pdfUrl ?? URL.createObjectURL(blobRef.current);
    link.download = invoiceFilenameFor(invoice);
    link.click();
  }

  // Erst prüfen, dann erzeugen: eine XRechnung mit Lücken wird vom Empfänger
  // abgelehnt, und der Grund ist dort schwerer zu finden als hier.
  function downloadXRechnung() {
    const issues = checkXRechnung(invoice, settings);
    if (issues.length > 0) {
      setXmlIssues(issues);
      return;
    }
    setXmlIssues([]);
    const blob = new Blob([buildInvoiceXml(invoice, settings)], {
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = invoiceXmlFilename(invoice);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    // Spalte statt fester Gridzeilen: die Meldungsleiste erscheint nur manchmal,
    // und feste Zeilen hätten den PDF-Kasten sonst in eine auto-Zeile geschoben.
    <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-zinc-950/50 p-6">
      <div className="flex items-center justify-end gap-2">
        {pdfError && (
          <span className="max-w-56 truncate rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {pdfError}
          </span>
        )}
        <Button
          type="button"
          size="icon"
          className="bg-[var(--brand)] text-white hover:opacity-90"
          aria-label="Als PDF herunterladen"
          title="Als PDF herunterladen"
          disabled={!pdfUrl}
          onClick={downloadPdf}
        >
          <Download />
        </Button>
        <Button
          type="button"
          size="icon"
          className="bg-[var(--brand)] text-white hover:opacity-90"
          aria-label="XRechnung herunterladen"
          title="XRechnung herunterladen"
          onClick={downloadXRechnung}
        >
          <FileCode2 />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Schließen" title="Schließen" onClick={onClose}>
          <X />
        </Button>
      </div>

      {xmlIssues.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="font-semibold">Die XRechnung lässt sich noch nicht erzeugen:</div>
          <ul className="mt-1 list-disc pl-4">
            {xmlIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 rounded-md bg-zinc-100 shadow-2xl">
        {pdfUrl ? (
          <iframe src={pdfUrl} title="Rechnung PDF" className="size-full rounded-md border-0" />
        ) : (
          <div className="grid size-full place-items-center text-sm text-[var(--muted-foreground)]">
            {pdfError ?? <Loader2 className="animate-spin" />}
          </div>
        )}
      </div>
    </div>
  );
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
            onFocus={(event) => {
              setFocused(true);
              event.target.select();
            }}
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
      onFocus={(event) => {
        const input = event.target;
        setFocused(true);
        setDraft(value ? String(value).replace(".", ",") : "");
        // Select after the draft value has been rendered into the input.
        window.setTimeout(() => input.select(), 0);
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
    <div className="flex items-center text-xs font-semibold sm:ml-2">
      {steps.map((step, index) => {
        const active = step.id === status;
        const canBill = status === "draft" && step.id === "billed";
        const canPay = status === "billed" && step.id === "paid";
        const canReturnToDraft = status === "billed" && step.id === "draft";
        const className = cn(
          "relative inline-flex h-8 min-w-[5.5rem] items-center justify-center px-4 pl-5 sm:min-w-[6.75rem]",
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
  for (const invoice of invoices) {
    for (const line of invoice.data.lines) {
      if (line.product_form) forms.add(line.product_form);
      if (line.product_topic) topics.add(line.product_topic);
    }
  }
  const sort = (items: Set<string>) => [...items].sort((a, b) => a.localeCompare(b, "de"));
  // Einheiten kommen aus der festen Liste statt aus den Bestandsdaten: nur für
  // sie gibt es einen Code, und ohne Code lässt sich keine XRechnung erzeugen.
  return { forms: sort(forms), topics: sort(topics), units: INVOICE_UNIT_LABELS };
}
