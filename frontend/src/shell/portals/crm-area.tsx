import * as React from "react";
import { Filter, IdCard, Loader2, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  loadSelectionRpu,
  setScopeRpu,
  setSearchTermRpu,
  getVisibleEntitiesRpu,
  getBusinessPartnerOptionsRpu,
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

  function changeSearch(term: string) {
    setSearchTermRpu(term);
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
          <ScopeFilter view={view} onChange={changeScope} />
        </div>
      </Column>
      <Column
        icon={<IdCard className="size-4" />}
        title="Übersicht"
        action={
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
        }
      >
        <CardList view={view} error={error} selected={selected} onSelect={selectEntity} />
      </Column>
      {detailOpen && selected && (
        <EntityOverlay>
          <EntityDetail
            selected={selected}
            focusCompanyContactId={focusCompanyContactId}
            focusBusinessPartnerId={focusBusinessPartnerId}
            onCompanyFocused={() => setFocusCompanyContactId(null)}
            onBusinessPartnerFocused={() => setFocusBusinessPartnerId(null)}
            onFocusBusinessPartner={(id) => setFocusBusinessPartnerId(id)}
            onClose={closeDetails}
            onChanged={refreshProjection}
            onNavigate={selectEntity}
            onDirtyChange={setDetailDirty}
          />
        </EntityOverlay>
      )}
      {creatingContact && (
        <EntityOverlay>
          <CreateContactDetail
            availableBusinessPartners={getBusinessPartnerOptionsRpu()}
            onClose={() => setCreatingContact(false)}
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
    </div>
  );
}

function EntityOverlay({ children }: { children: React.ReactNode }) {
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

function ScopeFilter({
  view,
  onChange,
}: {
  view: GetVisibleEntitiesResult | null;
  onChange: (scope: Scope) => void;
}) {
  const contactsActive = view?.scope === "both" || view?.scope === "contacts";
  const gpActive = view?.scope === "both" || view?.scope === "gp";

  function toggle(kind: "contacts" | "gp") {
    if (kind === "contacts") {
      if (contactsActive && gpActive) onChange("gp");
      else if (contactsActive) onChange("both");
      else onChange(gpActive ? "both" : "contacts");
      return;
    }
    if (contactsActive && gpActive) onChange("contacts");
    else if (gpActive) onChange("both");
    else onChange(contactsActive ? "both" : "gp");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle("contacts")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          contactsActive
            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
            : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
        )}
      >
        <span>Kontakte</span>
        {view && <span className="text-xs opacity-80">{view.counts.contacts}</span>}
      </button>
      <button
        type="button"
        onClick={() => toggle("gp")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          gpActive
            ? "border-[var(--gp)] bg-[var(--gp)] text-white"
            : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
        )}
      >
        <span>Geschäftspartner</span>
        {view && <span className="text-xs opacity-80">{view.counts.businessPartners}</span>}
      </button>
    </div>
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
