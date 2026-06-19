import * as React from "react";
import { Check, Filter, IdCard, Loader2, Search, PanelRightOpen, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  loadSelectionRpu,
  setScopeRpu,
  setSearchTermRpu,
  getVisibleEntitiesRpu,
  selectEntityRpu,
  getSelectedEntityRpu,
  createContactRpu,
} from "@/composition";
import type { Scope } from "@/domain/rpus/set-scope/set-scope";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";
import type { GetVisibleEntitiesResult } from "@/domain/rpus/get-visible-entities/get-visible-entities";
import type { SelectedEntity } from "@/domain/rpus/get-selected-entity/get-selected-entity";
import { ContactCard } from "./contact-card";
import { GpCard } from "./gp-card";
import { EntityDetail } from "./entity-detail";

const NO_PASSWORD_MANAGER_PROPS = {
  autoComplete: "new-password",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

/**
 * CRM area: three-column layout.
 *  - left:   filters — for now the entity-type scope (the "first filter")
 *  - middle: contact + business-partner cards, mixed and sorted by name
 *  - right:  details of the selected entity — coming in a later step
 *
 * All filtering/mixing/sorting/selection is domain logic that lives in RPUs
 * (get-visible-entities, set-scope, select-entity, get-selected-entity); this
 * component only renders what they return.
 */
export function CrmArea() {
  const [view, setView] = React.useState<GetVisibleEntitiesResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<SelectedEntity>(null);
  const [detailOpen, setDetailOpen] = React.useState(true);
  const [, setDetailDirty] = React.useState(false);
  const [creatingContact, setCreatingContact] = React.useState(false);
  const [newContactLastName, setNewContactLastName] = React.useState("");
  const [focusCompanyContactId, setFocusCompanyContactId] = React.useState<string | null>(null);
  const [focusBusinessPartnerId, setFocusBusinessPartnerId] = React.useState<string | null>(null);
  const detailScrollRef = React.useRef<HTMLDivElement | null>(null);

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
    window.setTimeout(() => detailScrollRef.current?.scrollTo({ top: 0 }), 0);
  }

  function refreshProjection() {
    setView(getVisibleEntitiesRpu());
    setSelected(getSelectedEntityRpu());
  }

  function closeDetails() {
    selectEntity(null);
    setDetailOpen(false);
  }

  async function createContactFromOverview(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmedLastName = newContactLastName.trim();
    if (!trimmedLastName) return;

    const result = await createContactRpu({
      active: true,
      data: { last_name: trimmedLastName, channels: [] },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setCreatingContact(false);
    setNewContactLastName("");
    setFocusCompanyContactId(result.contact.id);
    setView(getVisibleEntitiesRpu());
    selectEntity({ kind: "contact", id: result.contact.id });
  }

  return (
    <div
      className="grid h-full divide-x divide-[var(--border)]"
      style={{
        gridTemplateColumns: detailOpen
          ? "260px minmax(0,1fr) clamp(380px,25vw,560px)"
          : "260px minmax(0,1fr) 44px",
      }}
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
          creatingContact ? (
            <form className="flex items-center gap-1" onSubmit={createContactFromOverview}>
              <Input
                value={newContactLastName}
                {...NO_PASSWORD_MANAGER_PROPS}
                autoFocus
                placeholder="Nachname"
                className="h-8 w-36"
                onChange={(event) => setNewContactLastName(event.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                className="size-8 bg-[var(--brand)] text-white hover:opacity-90"
                disabled={!newContactLastName.trim()}
                aria-label="Kontakt anlegen"
                title="Kontakt anlegen"
              >
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Abbrechen"
                title="Abbrechen"
                onClick={() => {
                  setCreatingContact(false);
                  setNewContactLastName("");
                }}
              >
                <X />
              </Button>
            </form>
          ) : (
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
          )
        }
      >
        <CardList view={view} error={error} selected={selected} onSelect={selectEntity} />
      </Column>
      <DetailColumn open={detailOpen} onToggle={() => setDetailOpen((open) => !open)} scrollRef={detailScrollRef}>
        <EntityDetail
          selected={selected}
          focusCompanyContactId={focusCompanyContactId}
          focusBusinessPartnerId={focusBusinessPartnerId}
          onCompanyFocused={() => setFocusCompanyContactId(null)}
          onBusinessPartnerFocused={() => setFocusBusinessPartnerId(null)}
          onFocusCompanyContact={(id) => setFocusCompanyContactId(id)}
          onFocusBusinessPartner={(id) => setFocusBusinessPartnerId(id)}
          onClose={closeDetails}
          onChanged={refreshProjection}
          onCollapse={() => setDetailOpen(false)}
          onNavigate={selectEntity}
          onDirtyChange={setDetailDirty}
        />
      </DetailColumn>
    </div>
  );
}

function DetailColumn({
  open,
  onToggle,
  scrollRef,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full min-h-0">
      {!open ? (
        <div className="flex justify-center border-b border-[var(--border)] px-1 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Detailspalte ausklappen"
            onClick={onToggle}
          >
            <PanelRightOpen />
          </Button>
        </div>
      ) : (
        <div ref={scrollRef} className="h-full min-h-0 overflow-auto">{children}</div>
      )}
    </section>
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
        className="pl-8"
      />
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
  const options: { id: Scope; label: string }[] = [
    { id: "both", label: "Beide" },
    { id: "contacts", label: "Kontakte" },
    { id: "gp", label: "Geschäftspartner" },
  ];
  const counts: Record<Scope, number | null> = {
    both: view ? view.counts.contacts + view.counts.businessPartners : null,
    contacts: view ? view.counts.contacts : null,
    gp: view ? view.counts.businessPartners : null,
  };

  return (
    <div className="grid gap-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
            view?.scope === opt.id
              ? "bg-[var(--accent)] font-medium"
              : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
          )}
        >
          <span>{opt.label}</span>
          {counts[opt.id] !== null && (
            <span className="text-xs text-[var(--muted-foreground)]">{counts[opt.id]}</span>
          )}
        </button>
      ))}
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
            matchHint={entity.matchHint}
            selected={isSelected(selected, entity)}
            onClick={() => onSelect({ kind: "contact", id: entity.contact.id })}
          />
        ) : (
          <GpCard
            key={`bp-${entity.businessPartner.id}`}
            bp={entity.businessPartner}
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
