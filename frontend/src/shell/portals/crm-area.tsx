import * as React from "react";
import { ClipboardPaste, Filter, IdCard, Loader2, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagColorStyle } from "@/lib/tag-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  loadSelectionRpu,
  setScopeRpu,
  setSearchTermRpu,
  setIncludeInactiveRpu,
  setSelectedTagsRpu,
  getVisibleEntitiesRpu,
  getBusinessPartnerOptionsRpu,
  getCrmFilterTagsRpu,
  selectEntityRpu,
  getSelectedEntityRpu,
} from "@/composition";
import type { Scope } from "@/domain/rpus/set-scope/set-scope";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";
import type { GetVisibleEntitiesResult } from "@/domain/rpus/get-visible-entities/get-visible-entities";
import type { SelectedEntity } from "@/domain/rpus/get-selected-entity/get-selected-entity";
import { ContactCard } from "./contact-card";
import { GpCard } from "./gp-card";
import { CreateContactDetail, EntityDetail } from "./entity-detail";
import { EmailImportOverlay } from "./email-import-overlay";

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
  const [importingEmail, setImportingEmail] = React.useState(false);
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

  function changeSelectedTags(tags: string[]) {
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-[var(--brand)] text-white hover:opacity-90"
              aria-label="Neuen Kontakt anlegen"
              title="Neuen Kontakt anlegen"
              onClick={() => setCreatingContact(true)}
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-[var(--brand)] text-white hover:opacity-90"
              aria-label="E-Mail übernehmen"
              title="E-Mail übernehmen"
              onClick={() => setImportingEmail(true)}
            >
              <ClipboardPaste />
            </Button>
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
      {importingEmail && (
        <EmailImportOverlay
          onClose={() => setImportingEmail(false)}
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
  tags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [filter, setFilter] = React.useState("");
  const selected = new Set(selectedTags);
  const visibleTags = tags
    .filter((tag) => !selected.has(tag))
    .filter((tag) => tag.toLowerCase().includes(filter.trim().toLowerCase()))
    .slice(0, 24);

  function add(tag: string) {
    onChange([...selectedTags, tag]);
    setFilter("");
  }

  function remove(tag: string) {
    onChange(selectedTags.filter((selectedTag) => selectedTag !== tag));
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
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
                style={tagColorStyle(tag)}
                onClick={() => remove(tag)}
              >
                {tag}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full border px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
              style={tagColorStyle(tag)}
              onClick={() => add(tag)}
            >
              {tag}
            </button>
          ))}
          {tags.length === 0 && <div className="text-xs text-[var(--muted-foreground)]">Keine Tags vorhanden.</div>}
        </div>
      </div>
    </FilterGroup>
  );
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
