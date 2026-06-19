import * as React from "react";
import { Building2, Heart, PanelRightClose, Plus, Save, SaveOff, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createBusinessPartnerRpu,
  createContactRpu,
  getTagOptionsRpu,
  linkContactGpRpu,
  unlinkContactGpRpu,
  updateBusinessPartnerRpu,
  updateContactRpu,
} from "@/composition";
import type { BusinessPartnerData, Channel, ContactData } from "@/domain/model";
import type { SelectedEntity } from "@/domain/rpus/get-selected-entity/get-selected-entity";
import type { EntityRef } from "@/domain/rpus/select-entity/select-entity";
import type { TagOptions } from "@/domain/rpus/get-tag-options/get-tag-options";

const GENDER_OPTIONS: { value: NonNullable<ContactData["gender"]>; label: string }[] = [
  { value: "m", label: "männl." },
  { value: "f", label: "weibl." },
  { value: "d", label: "div." },
];
const SALUTATION_OPTIONS: { value: NonNullable<ContactData["salutation"]>; label: string }[] = [
  { value: "formal", label: "formell (Sie)" },
  { value: "informal", label: "informell (du)" },
];
const NO_PASSWORD_MANAGER_PROPS = {
  autoComplete: "new-password",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

export function EntityDetail({
  selected,
  focusCompanyContactId,
  focusBusinessPartnerId,
  onCompanyFocused,
  onBusinessPartnerFocused,
  onFocusCompanyContact,
  onFocusBusinessPartner,
  onClose,
  onChanged,
  onCollapse,
  onNavigate,
  onDirtyChange,
}: {
  selected: SelectedEntity;
  focusCompanyContactId: string | null;
  focusBusinessPartnerId: string | null;
  onCompanyFocused: () => void;
  onBusinessPartnerFocused: () => void;
  onFocusCompanyContact: (id: string) => void;
  onFocusBusinessPartner: (id: string) => void;
  onClose: () => void;
  onChanged: () => void;
  onCollapse: () => void;
  onNavigate: (ref: EntityRef) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  React.useEffect(() => {
    if (!selected) onDirtyChange(false);
  }, [selected, onDirtyChange]);

  if (!selected) {
    return (
      <div className="grid h-full place-items-center text-center text-sm text-[var(--muted-foreground)]">
        Wähle einen Eintrag.
      </div>
    );
  }

  const tagOptions = getTagOptionsRpu();

  return (
    <div className="grid gap-4 p-4">
      {selected.kind === "contact" ? (
        <ContactEditor
          selected={selected}
          autoFocusCompany={focusCompanyContactId === selected.contact.id}
          onCompanyFocused={onCompanyFocused}
          onFocusBusinessPartner={onFocusBusinessPartner}
          onChanged={onChanged}
          onClose={onClose}
          onCollapse={onCollapse}
          onNavigate={onNavigate}
          onDirtyChange={onDirtyChange}
          tagOptions={tagOptions}
        />
      ) : (
        <BusinessPartnerEditor
          selected={selected}
          autoFocusName={focusBusinessPartnerId === selected.businessPartner.id}
          onNameFocused={onBusinessPartnerFocused}
          onFocusCompanyContact={onFocusCompanyContact}
          onChanged={onChanged}
          onClose={onClose}
          onCollapse={onCollapse}
          onNavigate={onNavigate}
          onDirtyChange={onDirtyChange}
          tagOptions={tagOptions}
        />
      )}
    </div>
  );
}

function normalizeChannels(channels: Channel[]): Channel[] {
  return channels
    .map((c) => ({ type: c.type.trim(), address: c.address.trim() }))
    .filter((c) => c.type && c.address);
}

function normalizeTags(values: string[]): string[] | undefined {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeContactData(data: ContactData, channels: Channel[]): ContactData {
  return {
    title: normalizeOptional(data.title),
    first_name: normalizeOptional(data.first_name),
    last_name: normalizeOptional(data.last_name),
    gender: data.gender,
    salutation: data.salutation,
    origin: normalizeOptional(data.origin),
    company_text: normalizeOptional(data.company_text),
    channels: normalizeChannels(channels),
    relationship: normalizeTags(data.relationship ?? []),
    role: normalizeTags(data.role ?? []),
    work_area: normalizeTags(data.work_area ?? []),
    interests: normalizeTags(data.interests ?? []),
    tags: normalizeTags(data.tags ?? []),
    notes: normalizeOptional(data.notes),
  };
}

function normalizeBusinessPartnerData(data: BusinessPartnerData, channels: Channel[]): BusinessPartnerData {
  return {
    name: data.name.trim(),
    vat_id: normalizeOptional(data.vat_id),
    address: data.address
      ? {
          street: normalizeOptional(data.address.street),
          zip: normalizeOptional(data.address.zip),
          city: normalizeOptional(data.address.city),
          country: normalizeOptional(data.address.country),
        }
      : undefined,
    channels: normalizeChannels(channels),
    business_relationship: normalizeTags(data.business_relationship ?? []),
    tags: normalizeTags(data.tags ?? []),
    memo: normalizeOptional(data.memo),
    notes: normalizeOptional(data.notes),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-[var(--border)] pt-4 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">{title}</h3>
      {children}
    </section>
  );
}

function DetailToolbar({
  icon,
  dirty,
  busy,
  onSave,
  onClose,
  onCollapse,
}: {
  icon: React.ReactNode;
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] pb-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Detailspalte einklappen"
          onClick={onCollapse}
        >
          <PanelRightClose />
        </Button>
        <span>Details</span>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="icon" onClick={onSave} disabled={!dirty || busy} aria-label="Speichern">
          <Save />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
          <X />
        </Button>
      </div>
    </div>
  );
}

function TagField({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[] | undefined;
  options: string[];
  onChange: (values: string[] | undefined) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [localOptions, setLocalOptions] = React.useState<string[]>([]);
  const current = values ?? [];
  const allOptions = [...new Set([...options, ...localOptions])].sort((a, b) => a.localeCompare(b, "de"));
  const normalizedDraft = draft.trim().toLowerCase();
  const suggestions = allOptions.filter(
    (option) => option.toLowerCase().includes(normalizedDraft),
  );

  function add(value: string) {
    const next = value.trim();
    if (!next || current.includes(next)) return;
    setLocalOptions((known) => (known.includes(next) ? known : [...known, next]));
    onChange([...current, next]);
    setDraft("");
    setOpen(false);
  }

  return (
    <Field label={label}>
      <div className="relative">
        <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-[var(--input)] px-2 py-1">
          {current.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs">
              {value}
              <button
                type="button"
                aria-label={`${value} entfernen`}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => onChange(current.filter((item) => item !== value))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={draft}
            {...NO_PASSWORD_MANAGER_PROPS}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                event.stopPropagation();
                add(draft);
              }
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Backspace" && !draft && current.length > 0) {
                onChange(current.slice(0, -1));
              }
            }}
            onBlur={() => window.setTimeout(() => {
              add(draft);
              setOpen(false);
            }, 120)}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {open && (suggestions.length > 0 || draft.trim()) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-lg">
            {suggestions.length > 0 ? (
              suggestions.map((option) => {
                const selected = current.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selected}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--accent)] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!selected) add(option);
                    }}
                  >
                    <span>{option}</span>
                    {selected && <span className="text-xs text-[var(--muted-foreground)]">bereits hinzugefügt</span>}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
                Mit Enter als neues Tag hinzufügen
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

function SingleTagField({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const suggestions = options.filter((option) => option.toLowerCase().includes(draft.trim().toLowerCase()));

  if (value.trim()) {
    return (
      <div className="flex h-9 items-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs">
          {value}
          <button
            type="button"
            aria-label={`${value} entfernen`}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={() => onChange("")}
          >
            ×
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={draft}
        placeholder={placeholder}
        {...NO_PASSWORD_MANAGER_PROPS}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            event.stopPropagation();
            onChange(draft.trim());
            setDraft("");
            setOpen(false);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            onChange(draft.trim());
            setDraft("");
            setOpen(false);
          }, 120);
        }}
      />
      {open && (suggestions.length > 0 || options.length === 0 || draft.trim()) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--accent)]"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option);
                  setDraft("");
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
              {options.length === 0 ? "Keine vorhandenen Typen" : "Kein passender Vorschlag"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelsEditor({
  channels,
  channelTypeOptions,
  onChange,
}: {
  channels: Channel[];
  channelTypeOptions: string[];
  onChange: (channels: Channel[]) => void;
}) {
  return (
    <div className="grid gap-2">
      {channels.map((channel, index) => (
        <div key={index} className="grid grid-cols-[112px_1fr_auto] gap-2">
          <SingleTagField
            value={channel.type}
            placeholder="Typ"
            options={channelTypeOptions}
            onChange={(value) => onChange(channels.map((c, i) => (i === index ? { ...c, type: value } : c)))}
          />
          <Input
            value={channel.address}
            placeholder="Adresse"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) =>
              onChange(
                channels.map((c, i) => (i === index ? { ...c, address: event.target.value } : c)),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(channels.filter((_, i) => i !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...channels, { type: "", address: "" }])}
      >
        <Plus /> Kanal
      </Button>
    </div>
  );
}

function ConfirmRemove({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = React.useState(false);
  return (
    <Button
      type="button"
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? "?" : <Trash2 aria-label={label} />}
    </Button>
  );
}

function SearchableSelect({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [filter, setFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.id === value);
  const visible = options
    .filter((option) => option.label.toLowerCase().includes(filter.trim().toLowerCase()))
    .slice(0, 5);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between rounded-md border border-[var(--input)] bg-transparent px-3 text-left text-sm"
        onClick={() => setOpen((next) => !next)}
      >
        <span className={selected ? "" : "text-[var(--muted-foreground)]"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-[var(--muted-foreground)]">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg">
          <Input
            value={filter}
            {...NO_PASSWORD_MANAGER_PROPS}
            placeholder="Filtern"
            onChange={(event) => setFilter(event.target.value)}
          />
          <div className="mt-2 grid max-h-48 gap-1 overflow-auto">
            {visible.map((option) => (
              <button
                key={option.id}
                type="button"
                className="rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--accent)]"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setFilter("");
                }}
              >
                {option.label}
              </button>
            ))}
            {visible.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
                Keine passenden Einträge
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UnsavedNavigationPrompt({
  onCancel,
  onSaveAndContinue,
  onContinueWithoutSave,
}: {
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onContinueWithoutSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--accent)] p-2 text-sm">
      <div className="font-medium">Ungespeicherte Änderungen!</div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Abbrechen"
          aria-label="Abbrechen"
          onClick={onCancel}
        >
          <X />
        </Button>
        <Button
          type="button"
          size="icon"
          title="Speichern und weiter"
          aria-label="Speichern und weiter"
          onClick={onSaveAndContinue}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Weiter ohne Speichern"
          aria-label="Weiter ohne Speichern"
          onClick={onContinueWithoutSave}
        >
          <SaveOff />
        </Button>
      </div>
    </div>
  );
}

function ContactEditor({
  selected,
  autoFocusCompany,
  onCompanyFocused,
  onFocusBusinessPartner,
  onChanged,
  onClose,
  onCollapse,
  onNavigate,
  onDirtyChange,
  tagOptions,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "contact" };
  autoFocusCompany: boolean;
  onCompanyFocused: () => void;
  onFocusBusinessPartner: (id: string) => void;
  onChanged: () => void;
  onClose: () => void;
  onCollapse: () => void;
  onNavigate: (ref: EntityRef) => void;
  onDirtyChange: (dirty: boolean) => void;
  tagOptions: TagOptions;
}) {
  const contact = selected.contact;
  const [active, setActive] = React.useState(contact.active);
  const [data, setData] = React.useState<ContactData>(contact.data);
  const [channels, setChannels] = React.useState<Channel[]>(contact.data.channels);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<EntityRef | null>(null);
  const companyInputRef = React.useRef<HTMLInputElement | null>(null);
  const currentPayload = { active, data: normalizeContactData(data, channels) };
  const originalPayload = { active: contact.active, data: normalizeContactData(contact.data, contact.data.channels) };
  const dirty = stableJson(currentPayload) !== stableJson(originalPayload);

  React.useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  React.useEffect(() => {
    setActive(contact.active);
    setData(contact.data);
    setChannels(contact.data.channels);
    setStatus(null);
    setErrors({});
  }, [contact.id, contact.updated_at, contact.data, contact.active]);

  React.useEffect(() => {
    if (!autoFocusCompany) return;
    window.setTimeout(() => {
      companyInputRef.current?.focus();
      companyInputRef.current?.select();
      onCompanyFocused();
    }, 0);
  }, [autoFocusCompany, contact.id, onCompanyFocused]);

  async function save(): Promise<boolean> {
    if (!dirty || busy) return true;
    setBusy(true);
    setStatus("Speichere...");
    setErrors({});
    const result = await updateContactRpu({
      id: contact.id,
      active: currentPayload.active,
      data: currentPayload.data,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setErrors(result.fields ?? {});
      return false;
    }
    setStatus(result.conflict ? "Gespeichert. Hinweis: Zwischenzeitliche Änderung überschrieben." : "Gespeichert.");
    onChanged();
    return true;
  }

  function navigateFromDetails(ref: EntityRef) {
    if (dirty) {
      setPendingNavigation(ref);
      return;
    }
    onNavigate(ref);
  }

  return (
    <div className="grid gap-5">
      <DetailToolbar
        icon={<User className="size-4 text-[var(--brand)]" />}
        dirty={dirty}
        busy={busy}
        onSave={save}
        onClose={onClose}
        onCollapse={onCollapse}
      />

      <Section title="Kontakt">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Aktiv
        </label>
        <Field label="Firma">
          <Input
            ref={companyInputRef}
            value={data.company_text ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, company_text: e.target.value })}
          />
        </Field>
        <Field label="Titel">
          <Input
            value={data.title ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname">
            <Input
              value={data.first_name ?? ""}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, first_name: e.target.value })}
            />
          </Field>
          <Field label="Nachname">
            <Input
              value={data.last_name ?? ""}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, last_name: e.target.value })}
            />
            {errors.last_name && <p className="text-xs text-[var(--destructive)]">{errors.last_name}</p>}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Geschlecht">
            <select
              value={data.gender ?? ""}
              onChange={(e) => setData({ ...data, gender: (e.target.value || undefined) as ContactData["gender"] })}
              className="h-9 rounded-md border border-[var(--input)] bg-transparent px-3 text-sm"
            >
              <option value="">-</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Anrede">
            <select
              value={data.salutation ?? ""}
              onChange={(e) =>
                setData({ ...data, salutation: (e.target.value || undefined) as ContactData["salutation"] })
              }
              className="h-9 rounded-md border border-[var(--input)] bg-transparent px-3 text-sm"
            >
              <option value="">-</option>
              {SALUTATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Kontaktquelle">
          <Input
            value={data.origin ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, origin: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Kanäle">
        <ChannelsEditor channels={channels} channelTypeOptions={tagOptions.channelTypes} onChange={setChannels} />
        {errors.channels && <p className="text-xs text-[var(--destructive)]">{errors.channels}</p>}
      </Section>

      <Section title="Klassifizierungen">
        <TagField
          label="Beziehungen"
          values={data.relationship}
          options={tagOptions.contact.relationship}
          onChange={(relationship) => setData({ ...data, relationship })}
        />
        <TagField
          label="Rollen"
          values={data.role}
          options={tagOptions.contact.role}
          onChange={(role) => setData({ ...data, role })}
        />
        <TagField
          label="Bereiche"
          values={data.work_area}
          options={tagOptions.contact.work_area}
          onChange={(work_area) => setData({ ...data, work_area })}
        />
        <TagField
          label="Interessen"
          values={data.interests}
          options={tagOptions.contact.interests}
          onChange={(interests) => setData({ ...data, interests })}
        />
        <TagField
          label="Tags"
          values={data.tags}
          options={tagOptions.contact.tags}
          onChange={(tags) => setData({ ...data, tags })}
        />
      </Section>

      <Section title="Notizen">
        <Textarea
          value={data.notes ?? ""}
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
        />
      </Section>

      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}

      {pendingNavigation && (
        <UnsavedNavigationPrompt
          onCancel={() => setPendingNavigation(null)}
          onSaveAndContinue={async () => {
            const saved = await save();
            if (!saved) return;
            const next = pendingNavigation;
            setPendingNavigation(null);
            onNavigate(next);
          }}
          onContinueWithoutSave={() => {
            const next = pendingNavigation;
            setPendingNavigation(null);
            onNavigate(next);
          }}
        />
      )}

      <ContactBusinessPartnerLinks
        selected={selected}
        onChanged={onChanged}
        onNavigate={navigateFromDetails}
        onFocusBusinessPartner={onFocusBusinessPartner}
        roleOptions={tagOptions.linkRoles}
      />
    </div>
  );
}

function BusinessPartnerEditor({
  selected,
  autoFocusName,
  onNameFocused,
  onFocusCompanyContact,
  onChanged,
  onClose,
  onCollapse,
  onNavigate,
  onDirtyChange,
  tagOptions,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "business_partner" };
  autoFocusName: boolean;
  onNameFocused: () => void;
  onFocusCompanyContact: (id: string) => void;
  onChanged: () => void;
  onClose: () => void;
  onCollapse: () => void;
  onNavigate: (ref: EntityRef) => void;
  onDirtyChange: (dirty: boolean) => void;
  tagOptions: TagOptions;
}) {
  const bp = selected.businessPartner;
  const [types, setTypes] = React.useState<string[]>(bp.types);
  const [data, setData] = React.useState<BusinessPartnerData>(bp.data);
  const [channels, setChannels] = React.useState<Channel[]>(bp.data.channels);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<EntityRef | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const currentPayload = {
    types: normalizeTags(types) ?? [],
    data: normalizeBusinessPartnerData(data, channels),
  };
  const originalPayload = {
    types: normalizeTags(bp.types) ?? [],
    data: normalizeBusinessPartnerData(bp.data, bp.data.channels),
  };
  const dirty = stableJson(currentPayload) !== stableJson(originalPayload);

  React.useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  React.useEffect(() => {
    setTypes(bp.types);
    setData(bp.data);
    setChannels(bp.data.channels);
    setStatus(null);
    setErrors({});
  }, [bp.id, bp.updated_at, bp.types, bp.data]);

  React.useEffect(() => {
    if (!autoFocusName) return;
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
      onNameFocused();
    }, 0);
  }, [autoFocusName, bp.id, onNameFocused]);

  async function save(): Promise<boolean> {
    if (!dirty || busy) return true;
    setBusy(true);
    setStatus("Speichere...");
    setErrors({});
    const result = await updateBusinessPartnerRpu({
      id: bp.id,
      types: currentPayload.types,
      data: currentPayload.data,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setErrors(result.fields ?? {});
      return false;
    }
    setStatus(result.conflict ? "Gespeichert. Hinweis: Zwischenzeitliche Änderung überschrieben." : "Gespeichert.");
    onChanged();
    return true;
  }

  function navigateFromDetails(ref: EntityRef) {
    if (dirty) {
      setPendingNavigation(ref);
      return;
    }
    onNavigate(ref);
  }

  return (
    <div className="grid gap-5">
      <DetailToolbar
        icon={<Building2 className="size-4 text-[var(--gp)]" />}
        dirty={dirty}
        busy={busy}
        onSave={save}
        onClose={onClose}
        onCollapse={onCollapse}
      />

      <Section title="Geschäftspartner">
        <Field label="Name">
          <Input
            ref={nameInputRef}
            value={data.name}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
          {errors.name && <p className="text-xs text-[var(--destructive)]">{errors.name}</p>}
        </Field>
        <Field label="Straße">
          <Textarea
            rows={2}
            value={data.address?.street ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, address: { ...data.address, street: e.target.value } })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="PLZ">
            <Input
              value={data.address?.zip ?? ""}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, address: { ...data.address, zip: e.target.value } })}
            />
          </Field>
          <Field label="Ort">
            <Input
              value={data.address?.city ?? ""}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, address: { ...data.address, city: e.target.value } })}
            />
          </Field>
        </div>
        <Field label="Land">
          <Input
            value={data.address?.country ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, address: { ...data.address, country: e.target.value } })}
          />
        </Field>
        <Field label="USt-ID">
          <Input
            value={data.vat_id ?? ""}
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(e) => setData({ ...data, vat_id: e.target.value })}
          />
        </Field>
        <TagField label="Typen" values={types} options={tagOptions.businessPartner.types} onChange={(next) => setTypes(next ?? [])} />
      </Section>

      <Section title="Kanäle">
        <ChannelsEditor channels={channels} channelTypeOptions={tagOptions.channelTypes} onChange={setChannels} />
      </Section>

      <Section title="Klassifizierungen">
        <TagField
          label="Tags"
          values={data.tags}
          options={tagOptions.businessPartner.tags}
          onChange={(tags) => setData({ ...data, tags })}
        />
      </Section>

      <Section title="Memo">
        <Textarea
          value={data.memo ?? ""}
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(e) => setData({ ...data, memo: e.target.value })}
        />
      </Section>
      <Section title="Notizen">
        <Textarea
          value={data.notes ?? ""}
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
        />
      </Section>

      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}

      {pendingNavigation && (
        <UnsavedNavigationPrompt
          onCancel={() => setPendingNavigation(null)}
          onSaveAndContinue={async () => {
            const saved = await save();
            if (!saved) return;
            const next = pendingNavigation;
            setPendingNavigation(null);
            onNavigate(next);
          }}
          onContinueWithoutSave={() => {
            const next = pendingNavigation;
            setPendingNavigation(null);
            onNavigate(next);
          }}
        />
      )}

      <BusinessPartnerContactLinks
        selected={selected}
        onChanged={onChanged}
        onNavigate={navigateFromDetails}
        onFocusCompanyContact={onFocusCompanyContact}
        roleOptions={tagOptions.linkRoles}
      />
    </div>
  );
}

function ContactBusinessPartnerLinks({
  selected,
  onChanged,
  onNavigate,
  onFocusBusinessPartner,
  roleOptions,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "contact" };
  onChanged: () => void;
  onNavigate: (ref: EntityRef) => void;
  onFocusBusinessPartner: (id: string) => void;
  roleOptions: string[];
}) {
  const [gpId, setGpId] = React.useState("");
  const [role, setRole] = React.useState("");
  const [primary, setPrimary] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);

  async function addExisting() {
    if (!gpId) return;
    const result = await linkContactGpRpu({ contact_id: selected.contact.id, gp_id: gpId, role, primary });
    setStatus(result.ok ? "Verknüpft." : result.error);
    if (result.ok) {
      setGpId("");
      onChanged();
    }
  }

  async function createAndAdd() {
    const created = await createBusinessPartnerRpu({
      types: [],
      data: { name: newName, channels: [] },
    });
    if (!created.ok) {
      setStatus(created.error);
      return;
    }
    const linked = await linkContactGpRpu({
      contact_id: selected.contact.id,
      gp_id: created.businessPartner.id,
      role,
      primary,
    });
    setStatus(linked.ok ? "Neu angelegt und verknüpft." : linked.error);
    if (linked.ok) {
      setNewName("");
      onChanged();
      onFocusBusinessPartner(created.businessPartner.id);
      onNavigate({ kind: "business_partner", id: created.businessPartner.id });
    }
  }

  return (
    <Section title="Geschäftspartner">
      <div className="grid gap-2">
        {selected.relatedBusinessPartners.map(({ link, businessPartner }) => (
          <div key={businessPartner.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2">
            <button
              type="button"
              className="min-w-0 text-left"
              onClick={() => onNavigate({ kind: "business_partner", id: businessPartner.id })}
            >
              <div className="truncate text-xs text-[var(--muted-foreground)]">{link.role}</div>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">{businessPartner.data.name}</span>
                {link.primary && <Heart className="size-3 shrink-0 fill-current text-[var(--brand)]" />}
              </div>
            </button>
            <PrimaryLinkButton
              primary={link.primary}
              onMakePrimary={async () => {
                if (link.primary) return;
                const result = await linkContactGpRpu({
                  contact_id: selected.contact.id,
                  gp_id: businessPartner.id,
                  role: link.role,
                  primary: true,
                });
                setStatus(result.ok ? "Als primär markiert." : result.error);
                if (result.ok) onChanged();
              }}
            />
            <ConfirmRemove
              label="Verknüpfung entfernen"
              onConfirm={async () => {
                const result = await unlinkContactGpRpu({
                  contact_id: selected.contact.id,
                  gp_id: businessPartner.id,
                });
                setStatus(result.ok ? "Verknüpfung entfernt." : result.error);
                if (result.ok) onChanged();
              }}
            />
          </div>
        ))}
        {selected.relatedBusinessPartners.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">Noch keine Verknüpfungen.</p>
        )}
      </div>
      <LinkControls role={role} setRole={setRole} roleOptions={roleOptions} primary={primary} setPrimary={setPrimary} />
      <div className="grid gap-2">
        <SearchableSelect
          value={gpId}
          placeholder="Bestehenden Geschäftspartner wählen"
          options={selected.availableBusinessPartners.map((bp) => ({ id: bp.id, label: bp.data.name }))}
          onChange={setGpId}
        />
        <Button type="button" variant="outline" size="sm" onClick={addExisting} disabled={!gpId || !role.trim()}>
          <Plus /> Hinzufügen
        </Button>
      </div>
      <div className="grid gap-2">
        <Input
          value={newName}
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neuer Geschäftspartner"
        />
        <Button type="button" variant="outline" size="sm" onClick={createAndAdd} disabled={!newName.trim() || !role.trim()}>
          <Plus /> Neu anlegen
        </Button>
      </div>
      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
    </Section>
  );
}

function BusinessPartnerContactLinks({
  selected,
  onChanged,
  onNavigate,
  onFocusCompanyContact,
  roleOptions,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "business_partner" };
  onChanged: () => void;
  onNavigate: (ref: EntityRef) => void;
  onFocusCompanyContact: (id: string) => void;
  roleOptions: string[];
}) {
  const [contactId, setContactId] = React.useState("");
  const [role, setRole] = React.useState("");
  const [primary, setPrimary] = React.useState(false);
  const [newLastName, setNewLastName] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);

  async function addExisting() {
    if (!contactId) return;
    const result = await linkContactGpRpu({
      contact_id: contactId,
      gp_id: selected.businessPartner.id,
      role,
      primary,
    });
    setStatus(result.ok ? "Verknüpft." : result.error);
    if (result.ok) {
      setContactId("");
      onChanged();
    }
  }

  async function createAndAdd() {
    const created = await createContactRpu({
      active: true,
      data: {
        last_name: newLastName.trim(),
        company_text: selected.businessPartner.data.name,
        channels: [],
      },
    });
    if (!created.ok) {
      setStatus(created.error);
      return;
    }
    const linked = await linkContactGpRpu({
      contact_id: created.contact.id,
      gp_id: selected.businessPartner.id,
      role,
      primary,
    });
    setStatus(linked.ok ? "Neu angelegt und verknüpft." : linked.error);
    if (linked.ok) {
      setNewLastName("");
      onChanged();
      onFocusCompanyContact(created.contact.id);
      onNavigate({ kind: "contact", id: created.contact.id });
    }
  }

  return (
    <Section title="Kontakte">
      <div className="grid gap-2">
        {selected.relatedContacts.map(({ link, contact }) => (
          <div key={contact.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2">
            <button
              type="button"
              className="min-w-0 text-left"
              onClick={() => onNavigate({ kind: "contact", id: contact.id })}
            >
              <div className="truncate text-xs text-[var(--muted-foreground)]">{link.role}</div>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {[contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ") || "-"}
                </span>
                {link.primary && <Heart className="size-3 shrink-0 fill-current text-[var(--brand)]" />}
              </div>
            </button>
            <PrimaryLinkButton
              primary={link.primary}
              onMakePrimary={async () => {
                if (link.primary) return;
                const result = await linkContactGpRpu({
                  contact_id: contact.id,
                  gp_id: selected.businessPartner.id,
                  role: link.role,
                  primary: true,
                });
                setStatus(result.ok ? "Als primär markiert." : result.error);
                if (result.ok) onChanged();
              }}
            />
            <ConfirmRemove
              label="Verknüpfung entfernen"
              onConfirm={async () => {
                const result = await unlinkContactGpRpu({
                  contact_id: contact.id,
                  gp_id: selected.businessPartner.id,
                });
                setStatus(result.ok ? "Verknüpfung entfernt." : result.error);
                if (result.ok) onChanged();
              }}
            />
          </div>
        ))}
        {selected.relatedContacts.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">Noch keine Verknüpfungen.</p>
        )}
      </div>
      <LinkControls
        role={role}
        setRole={setRole}
        roleOptions={roleOptions}
        primary={primary}
        setPrimary={setPrimary}
      />
      <div className="grid gap-2">
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Bestehenden Kontakt wählen</option>
          {selected.availableContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {[contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ") || contact.id}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={addExisting} disabled={!contactId || !role.trim()}>
          <Plus /> Hinzufügen
        </Button>
      </div>
      <div className="grid gap-2">
        <Input
          value={newLastName}
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(e) => setNewLastName(e.target.value)}
          placeholder="Nachname"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={createAndAdd}
          disabled={!newLastName.trim() || !role.trim()}
        >
          <Plus /> Neu anlegen
        </Button>
      </div>
      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
    </Section>
  );
}

function PrimaryLinkButton({
  primary,
  onMakePrimary,
}: {
  primary: boolean;
  onMakePrimary: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={primary}
      title={primary ? "Primäre Beziehung" : "Als primäre Beziehung markieren"}
      aria-label={primary ? "Primäre Beziehung" : "Als primäre Beziehung markieren"}
      onClick={onMakePrimary}
      className={primary ? "text-[var(--brand)] opacity-100 disabled:opacity-100" : ""}
    >
      <Heart className={primary ? "fill-current" : ""} />
    </Button>
  );
}

function LinkControls({
  role,
  setRole,
  roleOptions,
  primary,
  setPrimary,
}: {
  role: string;
  setRole: (role: string) => void;
  roleOptions: string[];
  primary: boolean;
  setPrimary: (primary: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <div>
        <SingleTagField
          value={role}
          options={roleOptions}
          placeholder="Rolle"
          onChange={setRole}
        />
      </div>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
        Primär
      </label>
    </div>
  );
}
