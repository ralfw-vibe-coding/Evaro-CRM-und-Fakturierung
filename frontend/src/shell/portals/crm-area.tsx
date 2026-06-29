import * as React from "react";
import { Building2, ClipboardPaste, FileDown, Filter, IdCard, Inbox, Loader2, MailCheck, Plus, Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagCategoryColorStyle } from "@/lib/tag-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadSelectionRpu,
  setScopeRpu,
  setSearchTermRpu,
  setIncludeInactiveRpu,
  setSelectedTagsRpu,
  getVisibleEntitiesRpu,
  getContactOptionsRpu,
  getBusinessPartnerOptionsRpu,
  getCrmFilterTagsRpu,
  selectEntityRpu,
  getSelectedEntityRpu,
  checkEmailIngestRpu,
  loadIngestsRpu,
} from "@/composition";
import type { Scope } from "@/domain/rpus/set-scope/set-scope";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";
import type { GetVisibleEntitiesResult, VisibleEntity } from "@/domain/rpus/get-visible-entities/get-visible-entities";
import type { SelectedEntity } from "@/domain/rpus/get-selected-entity/get-selected-entity";
import type { SelectedTagFilter } from "@/domain/pproviders/selection-store/selection-store-provider";
import { ContactCard } from "./contact-card";
import { GpCard } from "./gp-card";
import { CreateBusinessPartnerDetail, CreateContactDetail, EntityDetail } from "./entity-detail";
import { EmailImportOverlay } from "./email-import-overlay";

function csvCell(value: string | undefined): string {
  const text = value ?? "";
  return `"${text.replaceAll('"', '""')}"`;
}

function firstEmail(entity: VisibleEntity): string | undefined {
  const channels =
    entity.kind === "contact" ? entity.contact.data.channels : entity.businessPartner.data.channels;
  return channels.find((channel) => channel.type.toLowerCase() === "email")?.address;
}

function genderLabel(value: string | undefined): string {
  if (value === "m") return "m";
  if (value === "f") return "w";
  if (value === "d") return "d";
  return "";
}

function salutationLabel(value: string | undefined): string {
  if (value === "formal") return "s";
  if (value === "informal") return "d";
  return "";
}

function newsletterCsv(entities: VisibleEntity[]): string {
  const emailableEntities = entities
    .map((entity) => ({ entity, email: firstEmail(entity) }))
    .filter((item): item is { entity: VisibleEntity; email: string } => Boolean(item.email));
  const rows = [
    ["vorname", "nachname", "geschlecht", "anrede", "email-adresse"],
    ...emailableEntities.map(({ entity, email }) => {
      if (entity.kind === "business_partner") return ["", "", "", "", email];
      const data = entity.contact.data;
      return [
        data.first_name ?? "",
        data.last_name ?? "",
        genderLabel(data.gender),
        salutationLabel(data.salutation),
        email,
      ];
    }),
  ];
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

function downloadNewsletterCsv(entities: VisibleEntity[]) {
  const csv = newsletterCsv(entities);
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `newsletter-export-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * CRM area: two-column layout.
 *  - left:   filters — for now the entity-type scope (the "first filter")
 *  - middle: contact + business-partner cards, mixed and sorted by name
 *
 * All filtering/mixing/sorting/selection is domain logic that lives in RPUs
 * (get-visible-entities, set-scope, select-entity, get-selected-entity); this
 * component only renders what they return.
 */
export function CrmArea() {
  const [view, setView] = React.useState<GetVisibleEntitiesResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<SelectedEntity>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [, setDetailDirty] = React.useState(false);
  const [creatingContact, setCreatingContact] = React.useState(false);
  const [creatingBusinessPartner, setCreatingBusinessPartner] = React.useState(false);
  const [ingestOverlayMode, setIngestOverlayMode] = React.useState<"inbox" | "clipboard" | null>(null);
  const [initialIngestId, setInitialIngestId] = React.useState<string | null>(null);
  const [ingestPendingCount, setIngestPendingCount] = React.useState(0);
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [closeRequestToken, setCloseRequestToken] = React.useState(0);
  const [focusCompanyContactId, setFocusCompanyContactId] = React.useState<string | null>(null);
  const [focusBusinessPartnerId, setFocusBusinessPartnerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadSelectionRpu().then((result) => {
      if (cancelled) return;
      if (result.ok) setView(getVisibleEntitiesRpu());
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    refreshIngestCount();
  }, []);

  function changeScope(scope: Scope) {
    setScopeRpu(scope);
    setView(getVisibleEntitiesRpu());
  }

  async function changeIncludeInactive(includeInactive: boolean) {
    setIncludeInactiveRpu(includeInactive);
    const result = await loadSelectionRpu({ includeInactive });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setView(getVisibleEntitiesRpu());
    setSelected(getSelectedEntityRpu());
  }

  function changeSearch(term: string) {
    setSearchTermRpu(term);
    setView(getVisibleEntitiesRpu());
  }

  function changeSelectedTags(tags: SelectedTagFilter[]) {
    setSelectedTagsRpu(tags);
    setView(getVisibleEntitiesRpu());
  }

  function selectEntity(ref: EntityRef | null) {
    selectEntityRpu(ref);
    setSelected(getSelectedEntityRpu());
    setDetailDirty(false);
    if (ref) setDetailOpen(true);
  }

  function refreshProjection() {
    setView(getVisibleEntitiesRpu());
    setSelected(getSelectedEntityRpu());
    refreshIngestCount();
  }

  async function refreshIngestCount() {
    const result = await loadIngestsRpu();
    if (result.ok) setIngestPendingCount(result.result.pending_count);
  }

  async function checkEmailAndOpenInbox() {
    setCheckingEmail(true);
    const result = await checkEmailIngestRpu();
    setCheckingEmail(false);
    await refreshIngestCount();
    if (!result.ok || result.imported.length === 0) return;
    setInitialIngestId(result.imported[0].id);
    setIngestOverlayMode("inbox");
  }

  function openClipboardIngest() {
    setInitialIngestId(null);
    setIngestOverlayMode("clipboard");
  }

  function openIngestInbox() {
    setInitialIngestId(null);
    setIngestOverlayMode("inbox");
  }

  function closeIngestOverlay() {
    setIngestOverlayMode(null);
    setInitialIngestId(null);
    refreshIngestCount();
  }

  function closeDetails() {
    selectEntity(null);
    setDetailOpen(false);
  }

  return (
    <div
      className="grid h-full divide-x divide-[var(--border)]"
      style={{ gridTemplateColumns: "260px minmax(0,1fr)" }}
    >
      <Column icon={<Filter className="size-4" />} title="Filter">
        <div className="grid gap-4">
          <SearchField value={view?.searchTerm ?? ""} onChange={changeSearch} />
          <ActivityFilter includeInactive={view?.includeInactive ?? false} onChange={changeIncludeInactive} />
          <ArtFilter scope={view?.scope ?? "both"} onChange={changeScope} />
          <TagFilter
            tags={getCrmFilterTagsRpu()}
            selectedTags={view?.selectedTags ?? []}
            onChange={changeSelectedTags}
          />
        </div>
      </Column>
      <Column
        icon={<IdCard className="size-4" />}
        title={`Übersicht (${view?.entities.length ?? 0})`}
        action={
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="bg-[var(--brand)] text-white hover:opacity-90"
                  aria-label="Neu anlegen"
                  title="Neu anlegen"
                >
                  <Plus />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setCreatingContact(true)}>
                  <User className="text-[var(--brand)]" />
                  Kontakt
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreatingBusinessPartner(true)}>
                  <Building2 className="text-[var(--gp)]" />
                  Geschäftspartner
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-[var(--brand)] text-white hover:opacity-90"
              aria-label="E-Mail übernehmen"
              title="Zwischenablage übernehmen"
              onClick={openClipboardIngest}
            >
              <ClipboardPaste />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-[var(--brand)] text-white hover:opacity-90"
              aria-label="Postfach prüfen"
              title="Postfach prüfen"
              onClick={checkEmailAndOpenInbox}
              disabled={checkingEmail}
            >
              {checkingEmail ? <Loader2 className="animate-spin" /> : <MailCheck />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative bg-[var(--brand)] text-white hover:opacity-90"
              aria-label="Ingest Inbox öffnen"
              title="Ingest Inbox öffnen"
              onClick={openIngestInbox}
            >
              <Inbox />
              {ingestPendingCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--foreground)] px-1 text-[10px] leading-4 text-[var(--background)]">
                  {ingestPendingCount}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="bg-[var(--brand)] text-white hover:opacity-90"
                  aria-label="Import/Export"
                  title="Import/Export"
                >
                  <FileDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => downloadNewsletterCsv(view?.entities ?? [])}
                  disabled={(view?.entities.length ?? 0) === 0}
                >
                  <FileDown className="text-[var(--brand)]" />
                  Newsletter export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        <CardList view={view} error={error} selected={selected} onSelect={selectEntity} />
      </Column>
      {detailOpen && selected && (
        <EntityOverlay onClose={() => setCloseRequestToken((token) => token + 1)}>
          <EntityDetail
            selected={selected}
            focusCompanyContactId={focusCompanyContactId}
            focusBusinessPartnerId={focusBusinessPartnerId}
            onCompanyFocused={() => setFocusCompanyContactId(null)}
            onBusinessPartnerFocused={() => setFocusBusinessPartnerId(null)}
            onFocusBusinessPartner={(id) => setFocusBusinessPartnerId(id)}
            onClose={closeDetails}
            onChanged={refreshProjection}
            closeRequestToken={closeRequestToken}
            onNavigate={selectEntity}
            onDirtyChange={setDetailDirty}
          />
        </EntityOverlay>
      )}
      {creatingContact && (
        <EntityOverlay onClose={() => setCloseRequestToken((token) => token + 1)}>
          <CreateContactDetail
            availableBusinessPartners={getBusinessPartnerOptionsRpu()}
            onClose={() => setCreatingContact(false)}
            closeRequestToken={closeRequestToken}
            onCreated={(id) => {
            setCreatingContact(false);
            setFocusCompanyContactId(id);
            setView(getVisibleEntitiesRpu());
            selectEntity({ kind: "contact", id });
          }}
            onNavigate={(ref) => {
              setCreatingContact(false);
              selectEntity(ref);
            }}
            onChanged={refreshProjection}
          />
        </EntityOverlay>
      )}
      {creatingBusinessPartner && (
        <EntityOverlay onClose={() => setCloseRequestToken((token) => token + 1)}>
          <CreateBusinessPartnerDetail
            availableContacts={getContactOptionsRpu()}
            onClose={() => setCreatingBusinessPartner(false)}
            closeRequestToken={closeRequestToken}
            onCreated={(id) => {
              setCreatingBusinessPartner(false);
              setFocusBusinessPartnerId(id);
              setView(getVisibleEntitiesRpu());
              selectEntity({ kind: "business_partner", id });
            }}
            onNavigate={(ref) => {
              setCreatingBusinessPartner(false);
              selectEntity(ref);
            }}
            onChanged={refreshProjection}
          />
        </EntityOverlay>
      )}
      {ingestOverlayMode && (
        <EmailImportOverlay
          initialMode={ingestOverlayMode}
          initialSelectedId={initialIngestId}
          onClose={closeIngestOverlay}
          onChanged={refreshProjection}
          onNavigate={selectEntity}
        />
      )}
    </div>
  );
}

function EntityOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  React.useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (term: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Suchen…"
        className="pl-8 pr-8"
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">{title}</div>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  color = "neutral",
  children,
  onClick,
}: {
  active: boolean;
  color?: "neutral" | "contact" | "gp";
  children: React.ReactNode;
  onClick: () => void;
}) {
  const activeClass =
    color === "contact"
      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
      : color === "gp"
        ? "border-[var(--gp)] bg-[var(--gp)] text-white"
        : "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? activeClass : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
      )}
    >
      {children}
    </button>
  );
}

function ActivityFilter({
  includeInactive,
  onChange,
}: {
  includeInactive: boolean;
  onChange: (includeInactive: boolean) => void;
}) {
  return (
    <FilterGroup title="Aktivität">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={!includeInactive} onClick={() => onChange(false)}>
          Aktiv
        </FilterChip>
        <FilterChip active={includeInactive} onClick={() => onChange(!includeInactive)}>
          + Inaktive
        </FilterChip>
      </div>
    </FilterGroup>
  );
}

function ArtFilter({ scope, onChange }: { scope: Scope; onChange: (scope: Scope) => void }) {
  return (
    <FilterGroup title="Art">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={scope === "both"} onClick={() => onChange("both")}>
          Alle
        </FilterChip>
        <FilterChip active={scope === "contacts"} color="contact" onClick={() => onChange("contacts")}>
          Kontakte
        </FilterChip>
        <FilterChip active={scope === "gp"} color="gp" onClick={() => onChange("gp")}>
          Geschäftspartner
        </FilterChip>
      </div>
    </FilterGroup>
  );
}

function TagFilter({
  tags,
  selectedTags,
  onChange,
}: {
  tags: { category: string; label: string; tags: string[] }[];
  selectedTags: SelectedTagFilter[];
  onChange: (tags: SelectedTagFilter[]) => void;
}) {
  const [filter, setFilter] = React.useState("");
  const normalizedFilter = filter.trim().toLowerCase();
  const selected = new Set(selectedTags.map((item) => tagKey(item.category, item.tag)));
  const visibleGroups = tags
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => {
        if (selected.has(tagKey(group.category, tag))) return false;
        if (!normalizedFilter) return true;
        return tag.toLowerCase().includes(normalizedFilter) || group.label.toLowerCase().includes(normalizedFilter);
      }),
    }))
    .filter((group) => group.tags.length > 0);

  function add(category: string, tag: string) {
    onChange([...selectedTags, { category, tag }]);
    setFilter("");
  }

  function remove(category: string, tag: string) {
    const key = tagKey(category, tag);
    onChange(selectedTags.filter((selectedTag) => tagKey(selectedTag.category, selectedTag.tag) !== key));
  }

  return (
    <FilterGroup title="Tags">
      <div className="grid gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Tag suchen..."
            className="pl-8 pr-8"
          />
          {filter && (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              aria-label="Tag-Suche löschen"
              title="Tag-Suche löschen"
              onClick={() => setFilter("")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((item) => (
              <button
                key={tagKey(item.category, item.tag)}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
                style={tagCategoryColorStyle(item.category)}
                onClick={() => remove(item.category, item.tag)}
              >
                {item.tag}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
        {visibleGroups.map((group) => (
          <div key={group.category} className="grid gap-1">
            <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => (
                <button
                  key={tagKey(group.category, tag)}
                  type="button"
                  className="rounded-full border px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
                  style={tagCategoryColorStyle(group.category)}
                  onClick={() => add(group.category, tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
        {tags.length === 0 && <div className="text-xs text-[var(--muted-foreground)]">Keine Tags vorhanden.</div>}
      </div>
    </FilterGroup>
  );
}

function tagKey(category: string, tag: string): string {
  return `${category.toLowerCase()}:${tag.toLowerCase()}`;
}

function isSelected(selected: SelectedEntity, entity: { kind: string; contact?: { id: string }; businessPartner?: { id: string } }): boolean {
  if (!selected || selected.kind !== entity.kind) return false;
  return selected.kind === "contact"
    ? selected.contact.id === entity.contact?.id
    : selected.businessPartner.id === entity.businessPartner?.id;
}

function CardList({
  view,
  error,
  selected,
  onSelect,
}: {
  view: GetVisibleEntitiesResult | null;
  error: string | null;
  selected: SelectedEntity;
  onSelect: (ref: EntityRef) => void;
}) {
  if (error) return <Placeholder>{error}</Placeholder>;
  if (view === null) {
    return (
      <div className="grid h-full place-items-center text-[var(--muted-foreground)]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (view.entities.length === 0) return <Placeholder>Keine Einträge.</Placeholder>;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      {view.entities.map((entity) =>
        entity.kind === "contact" ? (
          <ContactCard
            key={`c-${entity.contact.id}`}
            contact={entity.contact}
            connectionCount={entity.connectionCount}
            companyFallback={entity.companyFallback}
            matchHint={entity.matchHint}
            selected={isSelected(selected, entity)}
            onClick={() => onSelect({ kind: "contact", id: entity.contact.id })}
          />
        ) : (
          <GpCard
            key={`bp-${entity.businessPartner.id}`}
            bp={entity.businessPartner}
            connectionCount={entity.connectionCount}
            matchHint={entity.matchHint}
            selected={isSelected(selected, entity)}
            onClick={() => onSelect({ kind: "business_partner", id: entity.businessPartner.id })}
          />
        ),
      )}
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
    <section className="grid min-h-0 grid-rows-[auto_1fr]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm font-medium">
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="min-h-0 overflow-auto p-4">{children}</div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center text-center text-sm text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}
