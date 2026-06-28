import * as React from "react";
import { Building2, Loader2, MapPinned, Plus, Save, SaveOff, Search, Trash2, User, X } from "lucide-react";
import { tagCategoryColorStyle, tagColorStyle } from "@/lib/tag-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createBusinessPartnerRpu,
  createContactRpu,
  deleteBusinessPartnerRpu,
  deleteContactRpu,
  getTagOptionsRpu,
  linkContactGpRpu,
  lookupBusinessPartnerRpu,
  unlinkContactGpRpu,
  updateBusinessPartnerRpu,
  updateContactRpu,
} from "@/composition";
import type { BusinessPartner, BusinessPartnerData, Channel, Contact, ContactData } from "@/domain/model";
import type { BusinessPartnerLookupCandidate } from "@/domain/pproviders/backend-api/backend-api-provider";
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
  onFocusBusinessPartner,
  onClose,
  onChanged,
  closeRequestToken = 0,
  onNavigate,
  onDirtyChange,
}: {
  selected: SelectedEntity;
  focusCompanyContactId: string | null;
  focusBusinessPartnerId: string | null;
  onCompanyFocused: () => void;
  onBusinessPartnerFocused: () => void;
  onFocusBusinessPartner: (id: string) => void;
  onClose: () => void;
  onChanged: () => void;
  closeRequestToken?: number;
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
          closeRequestToken={closeRequestToken}
          onNavigate={onNavigate}
          onDirtyChange={onDirtyChange}
          tagOptions={tagOptions}
        />
      ) : (
        <BusinessPartnerEditor
          selected={selected}
          autoFocusName={focusBusinessPartnerId === selected.businessPartner.id}
          onNameFocused={onBusinessPartnerFocused}
          onChanged={onChanged}
          onClose={onClose}
          closeRequestToken={closeRequestToken}
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

function splitCategorizedValue(value: string | undefined): string[] | undefined {
  const values = value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  return values.length > 0 ? values : undefined;
}

function serializeCategorizedValue(values: string[] | undefined): string | undefined {
  const normalized = values ? normalizeTags(values) : undefined;
  return normalized?.join(", ");
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
    invoice_language: data.invoice_language === "en" ? "en" : data.invoice_language === "de" ? "de" : undefined,
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

function googleMapsUrl(parts: Array<string | undefined>): string | null {
  const query = parts.map((part) => part?.trim()).filter(Boolean).join(" ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mergeChannels(existing: Channel[], incoming: Channel[]): Channel[] {
  const seen = new Set<string>();
  const result: Channel[] = [];
  for (const channel of [...existing, ...incoming]) {
    const type = channel.type.trim();
    const address = channel.address.trim();
    if (!type || !address) continue;
    const key = `${type.toLowerCase()}:${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ type, address });
  }
  return result;
}

function lookupNote(candidate: BusinessPartnerLookupCandidate): string {
  const today = new Intl.DateTimeFormat("de-DE").format(new Date());
  const lines = [`Recherche vom ${today}:`];
  const address = [
    candidate.address?.street,
    [candidate.address?.zip, candidate.address?.city].filter(Boolean).join(" "),
    candidate.address?.country,
  ].filter(Boolean).join(", ");
  if (address) lines.push(`Adresse: ${address}`);
  if (candidate.vat_id) lines.push(`USt-ID: ${candidate.vat_id}`);
  if (candidate.channels.length > 0) {
    lines.push(`Kanäle: ${candidate.channels.map((channel) => channel.address).join(", ")}`);
  }
  if (candidate.contacts_note) lines.push(`Ansprechpartner: ${candidate.contacts_note}`);
  if (candidate.sources.length > 0) {
    lines.push("", "Quellen:");
    for (const source of candidate.sources) lines.push(`- ${source.url}`);
  }
  return lines.join("\n");
}

function appendNotes(existing: string | undefined, addition: string): string {
  const current = existing?.trim();
  return current ? `${current}\n\n${addition}` : addition;
}

function contactDataFromNameInput(input: string, companyText?: string): ContactData {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const last_name = parts.length > 0 ? parts[parts.length - 1] : "";
  const first_name = parts.length > 1 ? parts.slice(0, -1).join(" ") : undefined;
  return {
    first_name,
    last_name,
    company_text: normalizeOptional(companyText),
    channels: [],
  };
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-sm">
      <div className="flex min-h-6 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--accent)] px-3 py-0.5 [&_button]:size-6 [&_svg]:size-3.5">
        <h3 className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">{title}</h3>
        {action}
      </div>
      <div className="grid gap-3 p-3">{children}</div>
    </section>
  );
}

function DetailToolbar({
  icon,
  dirty,
  busy,
  saveFeedback,
  extraAction,
  onSave,
  onDelete,
  onClose,
}: {
  icon: React.ReactNode;
  dirty: boolean;
  busy: boolean;
  saveFeedback?: "idle" | "saved" | "error";
  extraAction?: React.ReactNode;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [deleteArmed, setDeleteArmed] = React.useState(false);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] pb-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>Details</span>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        {extraAction}
        <Button
          type="button"
          size="icon"
          onClick={onSave}
          disabled={!dirty || busy}
          aria-label="Speichern"
          title="Speichern"
          className={[
            busy ? "animate-pulse" : "",
            saveFeedback === "saved" ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--background)]" : "",
            saveFeedback === "error" ? "ring-2 ring-[var(--destructive)] ring-offset-2 ring-offset-[var(--background)]" : "",
          ].filter(Boolean).join(" ")}
        >
          <Save className={saveFeedback === "saved" ? "text-emerald-100" : ""} />
        </Button>
        <Button
          type="button"
          variant={deleteArmed ? "destructive" : "ghost"}
          size="icon"
          disabled={busy}
          title={deleteArmed ? "Zum Löschen erneut klicken" : "Löschen"}
          aria-label={deleteArmed ? "Zum Löschen erneut klicken" : "Löschen"}
          onBlur={() => setDeleteArmed(false)}
          onClick={() => {
            if (!deleteArmed) {
              setDeleteArmed(true);
              return;
            }
            setDeleteArmed(false);
            onDelete();
          }}
        >
          {deleteArmed ? "?" : <Trash2 />}
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
  colorCategory,
  onChange,
}: {
  label: string;
  values: string[] | undefined;
  options: string[];
  colorCategory?: string;
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
  const chipStyle = colorCategory ? tagCategoryColorStyle(colorCategory) : undefined;

  function add(value: string) {
    const next = value.trim();
    if (!next || current.includes(next)) return;
    setLocalOptions((known) => (known.includes(next) ? known : [...known, next]));
    onChange([...current, next]);
    setDraft("");
    setOpen(false);
  }

  return (
    <div className="relative">
        <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-[var(--input)] px-1.5 py-0.5 shadow-sm">
          {current.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={chipStyle ?? tagColorStyle(value)}
            >
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
            placeholder={current.length === 0 ? label : ""}
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
  );
}

function SingleTagField({
  value,
  options,
  placeholder,
  inputRef,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const suggestions = options.filter((option) => option.toLowerCase().includes(draft.trim().toLowerCase()));

  if (value.trim()) {
    return (
      <div className="flex h-8 items-center rounded-md border border-[var(--input)] px-2 shadow-sm">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
          style={tagColorStyle(value)}
        >
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
        ref={inputRef}
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
  focusLastType,
  onFocusedLastType,
  onChange,
}: {
  channels: Channel[];
  channelTypeOptions: string[];
  focusLastType: boolean;
  onFocusedLastType: () => void;
  onChange: (channels: Channel[]) => void;
}) {
  const lastTypeRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!focusLastType) return;
    window.setTimeout(() => {
      lastTypeRef.current?.focus();
      onFocusedLastType();
    }, 0);
  }, [channels.length, focusLastType, onFocusedLastType]);

  return (
    <div className="grid gap-2">
      {channels.map((channel, index) => (
        <div key={index} className="grid grid-cols-[112px_1fr_auto] gap-2">
          <SingleTagField
            value={channel.type}
            placeholder="Typ"
            options={channelTypeOptions}
            inputRef={index === channels.length - 1 ? lastTypeRef : undefined}
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

function ContactCoreSections({
  active,
  data,
  channels,
  focusNewChannelType,
  errors,
  tagOptions,
  companyInputRef,
  onActiveChange,
  onDataChange,
  onChannelsChange,
  onFocusedLastChannelType,
  onAddChannel,
}: {
  active: boolean;
  data: ContactData;
  channels: Channel[];
  focusNewChannelType: boolean;
  errors: Record<string, string>;
  tagOptions: TagOptions;
  companyInputRef?: React.Ref<HTMLInputElement>;
  onActiveChange: (active: boolean) => void;
  onDataChange: React.Dispatch<React.SetStateAction<ContactData>>;
  onChannelsChange: (channels: Channel[]) => void;
  onFocusedLastChannelType: () => void;
  onAddChannel: () => void;
}) {
  return (
    <>
      <Section
        title="Kontakt"
        action={
          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
            <input type="checkbox" checked={active} onChange={(event) => onActiveChange(event.target.checked)} />
            Aktiv
          </label>
        }
      >
        <div className="grid grid-cols-12 gap-3">
          <Input
            value={data.first_name ?? ""}
            placeholder="Vorname"
            aria-label="Vorname"
            className="col-span-5 h-10 text-lg font-semibold"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) => onDataChange((current) => ({ ...current, first_name: event.target.value }))}
          />
          <div className="col-span-7 grid gap-1">
            <Input
              value={data.last_name ?? ""}
              placeholder="Nachname"
              aria-label="Nachname"
              className="h-10 text-lg font-semibold"
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(event) => onDataChange((current) => ({ ...current, last_name: event.target.value }))}
            />
            {errors.last_name && <p className="text-xs text-[var(--destructive)]">{errors.last_name}</p>}
          </div>
          <Input
            ref={companyInputRef}
            value={data.company_text ?? ""}
            placeholder="Firma"
            aria-label="Firma"
            className="col-span-12"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) => onDataChange((current) => ({ ...current, company_text: event.target.value }))}
          />
          <select
            value={data.gender ?? ""}
            aria-label="Geschlecht"
            onChange={(event) =>
              onDataChange((current) => ({
                ...current,
                gender: (event.target.value || undefined) as ContactData["gender"],
              }))
            }
            className={`col-span-4 h-8 rounded-md border border-[var(--input)] bg-transparent px-2.5 text-sm shadow-sm ${data.gender ? "" : "text-[var(--muted-foreground)]"}`}
          >
            <option value="">Geschlecht</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={data.salutation ?? ""}
            aria-label="Anrede"
            onChange={(event) =>
              onDataChange((current) => ({
                ...current,
                salutation: (event.target.value || undefined) as ContactData["salutation"],
              }))
            }
            className={`col-span-4 h-8 rounded-md border border-[var(--input)] bg-transparent px-2.5 text-sm shadow-sm ${data.salutation ? "" : "text-[var(--muted-foreground)]"}`}
          >
            <option value="">Anrede</option>
            {SALUTATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            value={data.title ?? ""}
            placeholder="Titel"
            aria-label="Titel"
            className="col-span-4"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) => onDataChange((current) => ({ ...current, title: event.target.value }))}
          />
          <div className="col-span-12">
            <TagField
              label="Kontaktquelle"
              colorCategory="contact.origin"
              values={splitCategorizedValue(data.origin)}
              options={tagOptions.contact.origin}
              onChange={(origin) =>
                onDataChange((current) => ({ ...current, origin: serializeCategorizedValue(origin) }))
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="Kanäle"
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kanal hinzufügen"
            title="Kanal hinzufügen"
            onClick={onAddChannel}
          >
            <Plus />
          </Button>
        }
      >
        <ChannelsEditor
          channels={channels}
          channelTypeOptions={tagOptions.channelTypes}
          focusLastType={focusNewChannelType}
          onFocusedLastType={onFocusedLastChannelType}
          onChange={onChannelsChange}
        />
        {errors.channels && <p className="text-xs text-[var(--destructive)]">{errors.channels}</p>}
      </Section>

      <Section title="Klassifizierungen">
        <div className="grid grid-cols-2 gap-3">
          <TagField
            label="Rollen"
            colorCategory="contact.role"
            values={data.role}
            options={tagOptions.contact.role}
            onChange={(role) => onDataChange((current) => ({ ...current, role }))}
          />
          <TagField
            label="Bereiche"
            colorCategory="contact.work_area"
            values={data.work_area}
            options={tagOptions.contact.work_area}
            onChange={(work_area) => onDataChange((current) => ({ ...current, work_area }))}
          />
          <TagField
            label="Interessen"
            colorCategory="contact.interests"
            values={data.interests}
            options={tagOptions.contact.interests}
            onChange={(interests) => onDataChange((current) => ({ ...current, interests }))}
          />
          <TagField
            label="Beziehungen"
            colorCategory="contact.relationship"
            values={data.relationship}
            options={tagOptions.contact.relationship}
            onChange={(relationship) => onDataChange((current) => ({ ...current, relationship }))}
          />
          <div className="col-span-2">
            <TagField
              label="Tags"
              colorCategory="contact.tags"
              values={data.tags}
              options={tagOptions.contact.tags}
              onChange={(tags) => onDataChange((current) => ({ ...current, tags }))}
            />
          </div>
        </div>
      </Section>
    </>
  );
}

function BusinessPartnerCoreSections({
  data,
  types,
  channels,
  focusNewChannelType,
  errors,
  tagOptions,
  nameInputRef,
  mapsHref,
  onDataChange,
  onTypesChange,
  onChannelsChange,
  onFocusedLastChannelType,
  onAddChannel,
}: {
  data: BusinessPartnerData;
  types: string[];
  channels: Channel[];
  focusNewChannelType: boolean;
  errors: Record<string, string>;
  tagOptions: TagOptions;
  nameInputRef?: React.Ref<HTMLInputElement>;
  mapsHref: string | null;
  onDataChange: React.Dispatch<React.SetStateAction<BusinessPartnerData>>;
  onTypesChange: (types: string[]) => void;
  onChannelsChange: (channels: Channel[]) => void;
  onFocusedLastChannelType: () => void;
  onAddChannel: () => void;
}) {
  return (
    <>
      <Section title="Geschäftspartner">
        <div className="grid gap-1">
          <Input
            ref={nameInputRef}
            value={data.name}
            placeholder="Name"
            aria-label="Name"
            className="h-10 text-lg font-semibold"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) => onDataChange((current) => ({ ...current, name: event.target.value }))}
          />
          {errors.name && <p className="text-xs text-[var(--destructive)]">{errors.name}</p>}
        </div>
        <Textarea
          rows={2}
          value={data.address?.street ?? ""}
          placeholder="Straße"
          aria-label="Straße"
          {...NO_PASSWORD_MANAGER_PROPS}
          onChange={(event) =>
            onDataChange((current) => ({ ...current, address: { ...current.address, street: event.target.value } }))
          }
        />
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
          <Input
            value={data.address?.zip ?? ""}
            placeholder="PLZ"
            aria-label="PLZ"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) =>
              onDataChange((current) => ({ ...current, address: { ...current.address, zip: event.target.value } }))
            }
          />
          <div className="flex gap-2">
            <Input
              value={data.address?.city ?? ""}
              placeholder="Ort"
              aria-label="Ort"
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(event) =>
                onDataChange((current) => ({
                  ...current,
                  address: { ...current.address, city: event.target.value },
                }))
              }
            />
            {mapsHref && (
              <Button type="button" variant="ghost" size="icon" asChild aria-label="Ort in Google Maps öffnen">
                <a href={mapsHref} target="_blank" rel="noreferrer" title="Ort in Google Maps öffnen">
                  <MapPinned />
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <SingleTagField
            value={data.address?.country ?? ""}
            placeholder="Land"
            options={tagOptions.businessPartner.countries}
            onChange={(value) =>
              onDataChange((current) => ({ ...current, address: { ...current.address, country: value } }))
            }
          />
          <div className="flex rounded-md border border-[var(--border)] p-0.5">
            {(["de", "en"] as const).map((language) => {
              const active = (data.invoice_language ?? "de") === language;
              return (
                <button
                  key={language}
                  type="button"
                  className={[
                    "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                    active ? "bg-[var(--brand)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                  ].join(" ")}
                  onClick={() => onDataChange((current) => ({ ...current, invoice_language: language }))}
                >
                  {language.toUpperCase()}
                </button>
              );
            })}
          </div>
          <Input
            value={data.vat_id ?? ""}
            placeholder="USt-ID"
            aria-label="USt-ID"
            {...NO_PASSWORD_MANAGER_PROPS}
            onChange={(event) => onDataChange((current) => ({ ...current, vat_id: event.target.value }))}
          />
        </div>
      </Section>

      <Section
        title="Kanäle"
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kanal hinzufügen"
            title="Kanal hinzufügen"
            onClick={onAddChannel}
          >
            <Plus />
          </Button>
        }
      >
        <ChannelsEditor
          channels={channels}
          channelTypeOptions={tagOptions.channelTypes}
          focusLastType={focusNewChannelType}
          onFocusedLastType={onFocusedLastChannelType}
          onChange={onChannelsChange}
        />
      </Section>

      <Section title="Klassifizierungen">
        <div className="grid gap-3">
          <TagField
            label="Typen"
            colorCategory="businessPartner.types"
            values={types}
            options={tagOptions.businessPartner.types}
            onChange={(next) => onTypesChange(next ?? [])}
          />
          <TagField
            label="Tags"
            colorCategory="businessPartner.tags"
            values={data.tags}
            options={tagOptions.businessPartner.tags}
            onChange={(tags) => onDataChange((current) => ({ ...current, tags }))}
          />
        </div>
      </Section>
    </>
  );
}

export function CreateContactDetail({
  availableBusinessPartners,
  onClose,
  closeRequestToken = 0,
  onCreated,
  onNavigate,
  onChanged,
}: {
  availableBusinessPartners: BusinessPartner[];
  onClose: () => void;
  closeRequestToken?: number;
  onCreated: (id: string) => void;
  onNavigate: (ref: EntityRef) => void;
  onChanged: () => void;
}) {
  const tagOptions = getTagOptionsRpu();
  const [active, setActive] = React.useState(true);
  const [data, setData] = React.useState<ContactData>({ channels: [] });
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [focusNewChannelType, setFocusNewChannelType] = React.useState(false);
  const [pendingBps, setPendingBps] = React.useState<BusinessPartner[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const companyInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastCloseRequestRef = React.useRef(closeRequestToken);
  const currentPayload = { active, data: normalizeContactData(data, channels) };
  const emptyPayload = { active: true, data: normalizeContactData({ channels: [] }, []) };
  const dirty = stableJson(currentPayload) !== stableJson(emptyPayload) || pendingBps.length > 0;
  const canSave = Boolean(currentPayload.data.last_name?.trim()) && !busy;

  React.useEffect(() => {
    window.setTimeout(() => {
      companyInputRef.current?.focus();
    }, 0);
  }, []);

  async function createContactWithPendingLinks(): Promise<string | null> {
    if (!canSave) return null;
    setBusy(true);
    setStatus("Lege Kontakt an...");
    setErrors({});
    const created = await createContactRpu({
      active: currentPayload.active,
      data: currentPayload.data,
    });
    if (!created.ok) {
      setBusy(false);
      setStatus(created.error);
      setErrors(created.fields ?? {});
      return null;
    }

    for (const bp of pendingBps) {
      setStatus(`Verknüpfe ${bp.data.name}...`);
      const linked = await linkContactGpRpu({
        contact_id: created.contact.id,
        gp_id: bp.id,
        primary: false,
      });
      if (!linked.ok) {
        setBusy(false);
        setStatus(linked.error);
        return null;
      }
    }

    return created.contact.id;
  }

  async function save() {
    const contactId = await createContactWithPendingLinks();
    if (!contactId) return;
    setBusy(false);
    setStatus("Gespeichert.");
    onChanged();
    onCreated(contactId);
  }

  async function createBusinessPartnerAndNavigate(name: string) {
    const contactId = await createContactWithPendingLinks();
    if (!contactId) return;

    setStatus("Lege Geschäftspartner an...");
    const created = await createBusinessPartnerRpu({
      types: [],
      data: { name, channels: [] },
    });
    if (!created.ok) {
      setBusy(false);
      setStatus(created.error);
      return;
    }

    setStatus("Verknüpfe Geschäftspartner...");
    const linked = await linkContactGpRpu({
      contact_id: contactId,
      gp_id: created.businessPartner.id,
      primary: false,
    });
    setBusy(false);
    if (!linked.ok) {
      setStatus(linked.error);
      return;
    }
    onChanged();
    onNavigate({ kind: "business_partner", id: created.businessPartner.id });
  }

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

  const pendingIds = new Set(pendingBps.map((bp) => bp.id));

  return (
    <div className="grid gap-5 p-4">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] pb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>Details</span>
          <User className="size-4 text-[var(--brand)]" />
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" onClick={save} disabled={!canSave} aria-label="Speichern">
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={requestClose} aria-label="Schließen">
            <X />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,680px)_minmax(320px,380px)] xl:items-start">
        <div className="grid content-start gap-5">
          <ContactCoreSections
            active={active}
            data={data}
            channels={channels}
            focusNewChannelType={focusNewChannelType}
            errors={errors}
            tagOptions={tagOptions}
            companyInputRef={companyInputRef}
            onActiveChange={setActive}
            onDataChange={setData}
            onChannelsChange={setChannels}
            onFocusedLastChannelType={() => setFocusNewChannelType(false)}
            onAddChannel={() => {
              setChannels([...channels, { type: "", address: "" }]);
              setFocusNewChannelType(true);
            }}
          />
        </div>

        <div className="grid content-start gap-5">
          <DraftContactBusinessPartnerLinks
            pendingBusinessPartners={pendingBps}
            availableBusinessPartners={availableBusinessPartners.filter((bp) => !pendingIds.has(bp.id))}
            defaultCompanyName={data.company_text ?? ""}
            busy={busy}
            onAddExisting={(bp) => setPendingBps([...pendingBps, bp])}
            onRemoveExisting={(id) => setPendingBps(pendingBps.filter((bp) => bp.id !== id))}
            onCreateBusinessPartner={createBusinessPartnerAndNavigate}
          />

          <Section title="Notizen">
            <Textarea
              value={data.notes ?? ""}
              placeholder="Notizen"
              aria-label="Notizen"
              rows={8}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Section>
        </div>
      </div>

      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
      {confirmClose && (
        <UnsavedCloseDialog
          onCancel={() => setConfirmClose(false)}
          onSaveAndClose={async () => {
            const contactId = await createContactWithPendingLinks();
            if (!contactId) return;
            setBusy(false);
            setConfirmClose(false);
            onChanged();
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

export function CreateBusinessPartnerDetail({
  availableContacts,
  onClose,
  closeRequestToken = 0,
  onCreated,
  onNavigate,
  onChanged,
}: {
  availableContacts: Contact[];
  onClose: () => void;
  closeRequestToken?: number;
  onCreated: (id: string) => void;
  onNavigate: (ref: EntityRef) => void;
  onChanged: () => void;
}) {
  const tagOptions = getTagOptionsRpu();
  const [types, setTypes] = React.useState<string[]>([]);
  const [data, setData] = React.useState<BusinessPartnerData>({ name: "", channels: [], invoice_language: "de" });
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [focusNewChannelType, setFocusNewChannelType] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [pendingContacts, setPendingContacts] = React.useState<Contact[]>([]);
  const [contactQuery, setContactQuery] = React.useState("");
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastCloseRequestRef = React.useRef(closeRequestToken);
  const currentPayload = {
    types: normalizeTags(types) ?? [],
    data: normalizeBusinessPartnerData(data, channels),
  };
  const emptyPayload = {
    types: [],
    data: normalizeBusinessPartnerData({ name: "", channels: [], invoice_language: "de" }, []),
  };
  const dirty =
    stableJson(currentPayload) !== stableJson(emptyPayload) ||
    pendingContacts.length > 0;
  const canSave = Boolean(currentPayload.data.name?.trim()) && !busy;

  React.useEffect(() => {
    window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
  }, []);

  async function createBusinessPartnerWithLinks(): Promise<BusinessPartner | null> {
    if (!canSave) {
      if (!currentPayload.data.name?.trim()) setErrors({ name: "Name ist erforderlich." });
      return null;
    }
    setBusy(true);
    setStatus(null);
    setErrors({});
    const created = await createBusinessPartnerRpu(currentPayload);
    if (!created.ok) {
      setBusy(false);
      setStatus(created.error);
      setErrors(created.fields ?? {});
      return null;
    }

    for (const contact of pendingContacts) {
      setStatus(`Verknüpfe ${contactDisplayName(contact)}...`);
      const linked = await linkContactGpRpu({
        contact_id: contact.id,
        gp_id: created.businessPartner.id,
        primary: false,
      });
      if (!linked.ok) {
        setBusy(false);
        setStatus(linked.error);
        return null;
      }
    }

    return created.businessPartner;
  }

  async function save() {
    const businessPartner = await createBusinessPartnerWithLinks();
    if (!businessPartner) return;

    setBusy(false);
    onChanged();
    onCreated(businessPartner.id);
  }

  async function createContactAndNavigate() {
    const contactData = contactDataFromNameInput(contactQuery, currentPayload.data.name);
    if (!contactData.last_name) return;
    const businessPartner = await createBusinessPartnerWithLinks();
    if (!businessPartner) return;

    const displayName = [contactData.first_name, contactData.last_name].filter(Boolean).join(" ");
    setStatus(`Lege Kontakt ${displayName || contactData.last_name} an...`);
    const contact = await createContactRpu({
      active: true,
      data: contactData,
    });
    if (!contact.ok) {
      setBusy(false);
      setStatus(contact.error);
      return null;
    }

    setStatus(`Verknüpfe ${contactDisplayName(contact.contact)}...`);
    const linked = await linkContactGpRpu({
      contact_id: contact.contact.id,
      gp_id: businessPartner.id,
      primary: false,
    });
    setBusy(false);
    if (!linked.ok) {
      setStatus(linked.error);
      return;
    }
    onChanged();
    onNavigate({ kind: "contact", id: contact.contact.id });
  }

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

  function applyLookupCandidate(candidate: BusinessPartnerLookupCandidate) {
    setData((current) => ({
      ...current,
      name: candidate.company_name || current.name,
      vat_id: candidate.vat_id ?? current.vat_id,
      address: {
        ...current.address,
        street: candidate.address?.street ?? current.address?.street,
        zip: candidate.address?.zip ?? current.address?.zip,
        city: candidate.address?.city ?? current.address?.city,
        country: candidate.address?.country ?? current.address?.country,
      },
      notes: appendNotes(current.notes, lookupNote(candidate)),
    }));
    setChannels((current) => mergeChannels(current, candidate.channels));
    setLookupOpen(false);
  }

  const mapsHref = googleMapsUrl([
    data.address?.street,
    data.address?.zip,
    data.address?.city,
    data.address?.country,
  ]);
  const pendingContactIds = new Set(pendingContacts.map((contact) => contact.id));

  return (
    <div className="grid gap-5 p-4">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] pb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>Details</span>
          <Building2 className="size-4 text-[var(--gp)]" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Unternehmensdaten suchen"
            title="Unternehmensdaten suchen"
            onClick={() => setLookupOpen(true)}
          >
            <Search />
          </Button>
          <Button type="button" size="icon" onClick={save} disabled={!canSave} aria-label="Speichern">
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={requestClose} aria-label="Schließen">
            <X />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <div className="grid content-start gap-5">
          <BusinessPartnerCoreSections
            data={data}
            types={types}
            channels={channels}
            focusNewChannelType={focusNewChannelType}
            errors={errors}
            tagOptions={tagOptions}
            nameInputRef={nameInputRef}
            mapsHref={mapsHref}
            onDataChange={setData}
            onTypesChange={setTypes}
            onChannelsChange={setChannels}
            onFocusedLastChannelType={() => setFocusNewChannelType(false)}
            onAddChannel={() => {
              setChannels([...channels, { type: "", address: "" }]);
              setFocusNewChannelType(true);
            }}
          />
        </div>

        <div className="grid content-start gap-5">
          <Section title="Kontakte">
            <div className="grid gap-2">
              {pendingContacts.map((contact) => (
                <div key={contact.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2">
                  <span className="truncate text-sm font-medium">{contactDisplayName(contact)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label="Verknüpfung entfernen"
                    title="Verknüpfung entfernen"
                    onClick={() => setPendingContacts(pendingContacts.filter((item) => item.id !== contact.id))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {pendingContacts.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">Noch keine Verknüpfungen.</p>
              )}
            </div>
            <ContactAttachInput
              value={contactQuery}
              contacts={availableContacts.filter((contact) => !pendingContactIds.has(contact.id))}
              onChange={setContactQuery}
              onPick={(id) => {
                const contact = availableContacts.find((candidate) => candidate.id === id);
                if (!contact || pendingContactIds.has(contact.id)) return;
                setPendingContacts([...pendingContacts, contact]);
                setContactQuery("");
              }}
              onCreate={createContactAndNavigate}
              createLabel="Kontakt neu anlegen"
              disabled={busy}
            />
          </Section>

          <Section title="Absprachen">
            <Textarea
              value={data.memo ?? ""}
              rows={5}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, memo: e.target.value })}
            />
            <h3 className="pt-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">Notizen</h3>
            <Textarea
              value={data.notes ?? ""}
              rows={8}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Section>
        </div>
      </div>

      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
      {confirmClose && (
        <UnsavedCloseDialog
          onCancel={() => setConfirmClose(false)}
          onSaveAndClose={async () => {
            await save();
          }}
          onCloseWithoutSave={() => {
            setConfirmClose(false);
            onClose();
          }}
        />
      )}
      {lookupOpen && (
        <BusinessPartnerLookupOverlay
          businessPartner={currentPayload.data}
          onClose={() => setLookupOpen(false)}
          onApply={applyLookupCandidate}
        />
      )}
    </div>
  );
}

function DraftContactBusinessPartnerLinks({
  pendingBusinessPartners,
  availableBusinessPartners,
  defaultCompanyName,
  busy,
  onAddExisting,
  onRemoveExisting,
  onCreateBusinessPartner,
}: {
  pendingBusinessPartners: BusinessPartner[];
  availableBusinessPartners: BusinessPartner[];
  defaultCompanyName: string;
  busy: boolean;
  onAddExisting: (bp: BusinessPartner) => void;
  onRemoveExisting: (id: string) => void;
  onCreateBusinessPartner: (name: string) => void;
}) {
  const [newName, setNewName] = React.useState("");
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  function fillDefaultCompanyName() {
    if (newName.trim()) return;
    const companyName = defaultCompanyName.trim();
    if (!companyName) return;
    setNewName(companyName);
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }

  return (
    <Section title="Geschäftspartner">
      <div className="grid gap-2">
        {pendingBusinessPartners.map((businessPartner) => (
          <div key={businessPartner.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2">
            <span className="truncate text-sm font-medium">{businessPartner.data.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Verknüpfung entfernen"
              title="Verknüpfung entfernen"
              onClick={() => onRemoveExisting(businessPartner.id)}
            >
              <X />
            </Button>
          </div>
        ))}
        {pendingBusinessPartners.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">Noch keine Verknüpfungen.</p>
        )}
      </div>
      <BusinessPartnerNameAttachInput
        ref={nameInputRef}
        value={newName}
        options={availableBusinessPartners.map((bp) => ({ id: bp.id, label: bp.data.name }))}
        onFocus={fillDefaultCompanyName}
        onChange={setNewName}
        onPick={(id) => {
          const bp = availableBusinessPartners.find((candidate) => candidate.id === id);
          if (!bp) return;
          onAddExisting(bp);
          setNewName("");
        }}
        onCreate={() => {
          const name = newName.trim();
          if (!name) return;
          onCreateBusinessPartner(name);
        }}
        busy={busy}
      />
    </Section>
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

function UnsavedCloseDialog({
  onCancel,
  onSaveAndClose,
  onCloseWithoutSave,
}: {
  onCancel: () => void;
  onSaveAndClose: () => void;
  onCloseWithoutSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm shadow-xl">
        <div className="font-medium">Ungespeicherte Änderungen!</div>
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
          title="Speichern und schließen"
          aria-label="Speichern und schließen"
          onClick={onSaveAndClose}
        >
          <Save />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Ohne Speichern schließen"
          aria-label="Ohne Speichern schließen"
          onClick={onCloseWithoutSave}
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
  closeRequestToken,
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
  closeRequestToken: number;
  onNavigate: (ref: EntityRef) => void;
  onDirtyChange: (dirty: boolean) => void;
  tagOptions: TagOptions;
}) {
  const contact = selected.contact;
  const [active, setActive] = React.useState(contact.active);
  const [data, setData] = React.useState<ContactData>(contact.data);
  const [channels, setChannels] = React.useState<Channel[]>(contact.data.channels);
  const [focusNewChannelType, setFocusNewChannelType] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [saveFeedback, setSaveFeedback] = React.useState<"idle" | "saved" | "error">("idle");
  const [pendingNavigation, setPendingNavigation] = React.useState<EntityRef | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const companyInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastCloseRequestRef = React.useRef(closeRequestToken);
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
    setFocusNewChannelType(false);
    setStatus(null);
    setErrors({});
    setSaveFeedback("idle");
  }, [contact.id, contact.updated_at, contact.data, contact.active]);

  React.useEffect(() => {
    if (saveFeedback === "idle") return;
    const id = window.setTimeout(() => setSaveFeedback("idle"), saveFeedback === "saved" ? 900 : 1600);
    return () => window.clearTimeout(id);
  }, [saveFeedback]);

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
    setStatus(null);
    setSaveFeedback("idle");
    setErrors({});
    const result = await updateContactRpu({
      id: contact.id,
      active: currentPayload.active,
      data: currentPayload.data,
    });
    setBusy(false);
    if (!result.ok) {
      setSaveFeedback("error");
      setErrors(result.fields ?? {});
      return false;
    }
    setSaveFeedback("saved");
    onChanged();
    return true;
  }

  async function remove(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setStatus("Lösche...");
    const result = await deleteContactRpu({ id: contact.id });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    onChanged();
    onClose();
  }

  function navigateFromDetails(ref: EntityRef) {
    if (dirty) {
      setPendingNavigation(ref);
      return;
    }
    onNavigate(ref);
  }

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

  return (
    <div className="grid gap-5">
      <DetailToolbar
        icon={<User className="size-4 text-[var(--brand)]" />}
        dirty={dirty}
        busy={busy}
        saveFeedback={saveFeedback}
        onSave={save}
        onDelete={remove}
        onClose={requestClose}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,680px)_minmax(320px,380px)] xl:items-start">
        <div className="grid content-start gap-5">
          <ContactCoreSections
            active={active}
            data={data}
            channels={channels}
            focusNewChannelType={focusNewChannelType}
            errors={errors}
            tagOptions={tagOptions}
            companyInputRef={companyInputRef}
            onActiveChange={setActive}
            onDataChange={setData}
            onChannelsChange={setChannels}
            onFocusedLastChannelType={() => setFocusNewChannelType(false)}
            onAddChannel={() => {
              setChannels([...channels, { type: "", address: "" }]);
              setFocusNewChannelType(true);
            }}
          />
        </div>

        <div className="grid content-start gap-5">
          <ContactBusinessPartnerLinks
            selected={selected}
            defaultCompanyName={data.company_text ?? ""}
            onChanged={onChanged}
            onSaveContact={save}
            onNavigate={navigateFromDetails}
            onFocusBusinessPartner={onFocusBusinessPartner}
          />

          <Section title="Notizen">
            <Textarea
              value={data.notes ?? ""}
              placeholder="Notizen"
              aria-label="Notizen"
              rows={8}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Section>
        </div>
      </div>

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

      {confirmClose && (
        <UnsavedCloseDialog
          onCancel={() => setConfirmClose(false)}
          onSaveAndClose={async () => {
            const saved = await save();
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

function BusinessPartnerEditor({
  selected,
  autoFocusName,
  onNameFocused,
  onChanged,
  onClose,
  closeRequestToken,
  onNavigate,
  onDirtyChange,
  tagOptions,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "business_partner" };
  autoFocusName: boolean;
  onNameFocused: () => void;
  onChanged: () => void;
  onClose: () => void;
  closeRequestToken: number;
  onNavigate: (ref: EntityRef) => void;
  onDirtyChange: (dirty: boolean) => void;
  tagOptions: TagOptions;
}) {
  const bp = selected.businessPartner;
  const [types, setTypes] = React.useState<string[]>(bp.types);
  const [data, setData] = React.useState<BusinessPartnerData>(bp.data);
  const [channels, setChannels] = React.useState<Channel[]>(bp.data.channels);
  const [focusNewChannelType, setFocusNewChannelType] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [saveFeedback, setSaveFeedback] = React.useState<"idle" | "saved" | "error">("idle");
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<EntityRef | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastCloseRequestRef = React.useRef(closeRequestToken);
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
    setFocusNewChannelType(false);
    setStatus(null);
    setErrors({});
    setSaveFeedback("idle");
  }, [bp.id, bp.updated_at, bp.types, bp.data]);

  React.useEffect(() => {
    if (saveFeedback === "idle") return;
    const id = window.setTimeout(() => setSaveFeedback("idle"), saveFeedback === "saved" ? 900 : 1600);
    return () => window.clearTimeout(id);
  }, [saveFeedback]);

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
    setStatus(null);
    setSaveFeedback("idle");
    setErrors({});
    const result = await updateBusinessPartnerRpu({
      id: bp.id,
      types: currentPayload.types,
      data: currentPayload.data,
    });
    setBusy(false);
    if (!result.ok) {
      setSaveFeedback("error");
      setErrors(result.fields ?? {});
      return false;
    }
    setSaveFeedback("saved");
    onChanged();
    return true;
  }

  async function remove(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setStatus("Lösche...");
    const result = await deleteBusinessPartnerRpu({ id: bp.id });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    onChanged();
    onClose();
  }

  function navigateFromDetails(ref: EntityRef) {
    if (dirty) {
      setPendingNavigation(ref);
      return;
    }
    onNavigate(ref);
  }

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

  const mapsHref = googleMapsUrl([
    data.address?.street,
    data.address?.zip,
    data.address?.city,
    data.address?.country,
  ]);

  function applyLookupCandidate(candidate: BusinessPartnerLookupCandidate) {
    setData((current) => ({
      ...current,
      name: candidate.company_name || current.name,
      vat_id: candidate.vat_id ?? current.vat_id,
      address: {
        ...current.address,
        street: candidate.address?.street ?? current.address?.street,
        zip: candidate.address?.zip ?? current.address?.zip,
        city: candidate.address?.city ?? current.address?.city,
        country: candidate.address?.country ?? current.address?.country,
      },
      notes: appendNotes(current.notes, lookupNote(candidate)),
    }));
    setChannels((current) => mergeChannels(current, candidate.channels));
    setLookupOpen(false);
  }

  return (
    <div className="grid gap-5">
      <DetailToolbar
        icon={<Building2 className="size-4 text-[var(--gp)]" />}
        dirty={dirty}
        busy={busy}
        saveFeedback={saveFeedback}
        extraAction={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Unternehmensdaten suchen"
            title="Unternehmensdaten suchen"
            onClick={() => setLookupOpen(true)}
          >
            <Search />
          </Button>
        }
        onSave={save}
        onDelete={remove}
        onClose={requestClose}
      />

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <div className="grid content-start gap-5">
          <BusinessPartnerCoreSections
            data={data}
            types={types}
            channels={channels}
            focusNewChannelType={focusNewChannelType}
            errors={errors}
            tagOptions={tagOptions}
            nameInputRef={nameInputRef}
            mapsHref={mapsHref}
            onDataChange={setData}
            onTypesChange={setTypes}
            onChannelsChange={setChannels}
            onFocusedLastChannelType={() => setFocusNewChannelType(false)}
            onAddChannel={() => {
              setChannels([...channels, { type: "", address: "" }]);
              setFocusNewChannelType(true);
            }}
          />
        </div>

        <div className="grid content-start gap-5">
          <BusinessPartnerContactLinks
            selected={selected}
            onChanged={onChanged}
            onSaveBusinessPartner={save}
            onNavigate={navigateFromDetails}
          />

          <Section title="Absprachen">
            <Textarea
              value={data.memo ?? ""}
              rows={5}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, memo: e.target.value })}
            />
            <h3 className="pt-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">Notizen</h3>
            <Textarea
              value={data.notes ?? ""}
              rows={8}
              {...NO_PASSWORD_MANAGER_PROPS}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </Section>
        </div>
      </div>

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

      {confirmClose && (
        <UnsavedCloseDialog
          onCancel={() => setConfirmClose(false)}
          onSaveAndClose={async () => {
            const saved = await save();
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

      {lookupOpen && (
        <BusinessPartnerLookupOverlay
          businessPartner={currentPayload.data}
          onClose={() => setLookupOpen(false)}
          onApply={applyLookupCandidate}
        />
      )}

    </div>
  );
}

function ContactBusinessPartnerLinks({
  selected,
  defaultCompanyName,
  onChanged,
  onSaveContact,
  onNavigate,
  onFocusBusinessPartner,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "contact" };
  defaultCompanyName: string;
  onChanged: () => void;
  onSaveContact: () => Promise<boolean>;
  onNavigate: (ref: EntityRef) => void;
  onFocusBusinessPartner: (id: string) => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setNewName("");
    setStatus(null);
  }, [selected.contact.id]);

  async function addExisting(gpId: string) {
    if (busy) return;
    setBusy(true);
    setStatus("Speichere Kontakt...");
    const saved = await onSaveContact();
    if (!saved) {
      setBusy(false);
      return;
    }
    setStatus("Verknüpfe Geschäftspartner...");
    const result = await linkContactGpRpu({ contact_id: selected.contact.id, gp_id: gpId, primary: false });
    setBusy(false);
    setStatus(result.ok ? "Verknüpft." : result.error);
    if (result.ok) {
      setNewName("");
      onChanged();
    }
  }

  async function createAndAdd() {
    if (busy) return;
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setStatus("Speichere Kontakt...");
    const saved = await onSaveContact();
    if (!saved) {
      setBusy(false);
      return;
    }
    setStatus("Lege Geschäftspartner an...");
    const created = await createBusinessPartnerRpu({
      types: [],
      data: { name, channels: [] },
    });
    if (!created.ok) {
      setBusy(false);
      setStatus(created.error);
      return;
    }
    setStatus("Verknüpfe Geschäftspartner...");
    const linked = await linkContactGpRpu({
      contact_id: selected.contact.id,
      gp_id: created.businessPartner.id,
      primary: false,
    });
    setBusy(false);
    setStatus(linked.ok ? "Neu angelegt und verknüpft." : linked.error);
    if (linked.ok) {
      setNewName("");
      onChanged();
      onFocusBusinessPartner(created.businessPartner.id);
      onNavigate({ kind: "business_partner", id: created.businessPartner.id });
    }
  }

  function fillDefaultCompanyName() {
    if (newName.trim()) return;
    const companyName = defaultCompanyName.trim();
    if (!companyName) return;
    setNewName(companyName);
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }

  return (
    <Section title="Geschäftspartner">
      <div className="grid gap-2">
        {selected.relatedBusinessPartners.map(({ businessPartner }) => (
          <div key={businessPartner.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2">
            <button
              type="button"
              className="min-w-0 cursor-pointer rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--accent)]"
              onClick={() => onNavigate({ kind: "business_partner", id: businessPartner.id })}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">{businessPartner.data.name}</span>
              </div>
            </button>
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
      <BusinessPartnerNameAttachInput
        ref={nameInputRef}
        value={newName}
        options={selected.availableBusinessPartners.map((bp) => ({ id: bp.id, label: bp.data.name }))}
        onFocus={fillDefaultCompanyName}
        onChange={setNewName}
        onPick={addExisting}
        onCreate={createAndAdd}
        busy={busy}
      />
      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
    </Section>
  );
}

const BusinessPartnerNameAttachInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    options: { id: string; label: string }[];
    onFocus: () => void;
    onChange: (value: string) => void;
    onPick: (id: string) => void;
    onCreate: () => void;
    busy: boolean;
  }
>(function BusinessPartnerNameAttachInput(
  { value, options, onFocus, onChange, onPick, onCreate, busy },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  const query = value.trim().toLowerCase();
  const visible = options
    .filter((option) => !query || option.label.toLowerCase().includes(query))
    .slice(0, 5);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Input
          ref={ref}
          value={value}
          {...NO_PASSWORD_MANAGER_PROPS}
          placeholder="Geschäftspartner"
          onFocus={() => {
            setFocused(true);
            onFocus();
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (busy) return;
            onCreate();
          }}
          disabled={busy}
        />
        <Button
          type="button"
          size="icon"
          className="bg-[var(--brand)] text-white hover:opacity-90"
          disabled={!value.trim() || busy}
          aria-label="Geschäftspartner neu anlegen"
          title="Geschäftspartner neu anlegen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCreate}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
        </Button>
      </div>
      {focused && (visible.length > 0 || query) && (
        <div className="absolute left-0 right-11 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg">
          {visible.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"
              onMouseDown={(event) => {
                event.preventDefault();
                if (busy) return;
                onPick(option.id);
              }}
            >
              {option.label}
            </button>
          ))}
          {visible.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">Kein bestehender GP gefunden</div>
          )}
        </div>
      )}
    </div>
  );
});

function BusinessPartnerContactLinks({
  selected,
  onChanged,
  onSaveBusinessPartner,
  onNavigate,
}: {
  selected: NonNullable<SelectedEntity> & { kind: "business_partner" };
  onChanged: () => void;
  onSaveBusinessPartner: () => Promise<boolean>;
  onNavigate: (ref: EntityRef) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setQuery("");
    setStatus(null);
    setBusy(false);
  }, [selected.businessPartner.id]);

  async function addExisting(contactId: string) {
    if (!contactId || busy) return;
    setBusy(true);
    setStatus("Speichere Geschäftspartner...");
    const saved = await onSaveBusinessPartner();
    if (!saved) {
      setBusy(false);
      return;
    }
    setStatus("Verknüpfe Kontakt...");
    const result = await linkContactGpRpu({
      contact_id: contactId,
      gp_id: selected.businessPartner.id,
      primary: false,
    });
    setBusy(false);
    setStatus(result.ok ? "Verknüpft." : result.error);
    if (result.ok) {
      setQuery("");
      onChanged();
    }
  }

  async function createAndAdd() {
    if (busy) return;
    const name = query.trim();
    if (!name) return;
    setBusy(true);
    setStatus("Speichere Geschäftspartner...");
    const saved = await onSaveBusinessPartner();
    if (!saved) {
      setBusy(false);
      return;
    }
    setStatus("Lege Kontakt an...");
    const created = await createContactRpu({
      active: true,
      data: contactDataFromNameInput(name, selected.businessPartner.data.name),
    });
    if (!created.ok) {
      setBusy(false);
      setStatus(created.error);
      return;
    }
    setStatus("Verknüpfe Kontakt...");
    const linked = await linkContactGpRpu({
      contact_id: created.contact.id,
      gp_id: selected.businessPartner.id,
      primary: false,
    });
    setBusy(false);
    setStatus(linked.ok ? "Neu angelegt und verknüpft." : linked.error);
    if (linked.ok) {
      setQuery("");
      onChanged();
      onNavigate({ kind: "contact", id: created.contact.id });
    }
  }

  return (
    <Section title="Kontakte">
      <div className="grid gap-2">
        {selected.relatedContacts.map(({ link, contact }) => (
          <div key={contact.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2">
            <button
              type="button"
              className="min-w-0 cursor-pointer rounded px-1 py-0.5 text-left transition-colors hover:bg-[var(--accent)]"
              onClick={() => onNavigate({ kind: "contact", id: contact.id })}
            >
              {link.role && <div className="truncate text-xs text-[var(--muted-foreground)]">{link.role}</div>}
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {[contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ") || "-"}
                </span>
              </div>
            </button>
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
      <ContactAttachInput
        value={query}
        contacts={selected.availableContacts}
        onChange={setQuery}
        onPick={addExisting}
        onCreate={createAndAdd}
        createLabel="Kontakt neu anlegen"
        disabled={busy}
      />
      {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
    </Section>
  );
}

function contactDisplayName(contact: Contact): string {
  return [contact.data.first_name, contact.data.last_name].filter(Boolean).join(" ") || contact.data.company_text || contact.id;
}

function ContactAttachInput({
  value,
  contacts,
  onChange,
  onPick,
  onCreate,
  createLabel = "Neu anlegen",
  disabled = false,
}: {
  value: string;
  contacts: Contact[];
  onChange: (value: string) => void;
  onPick: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const query = value.trim().toLowerCase();
  const visible = contacts
    .filter((contact) => {
      if (!query) return true;
      return [
        contact.data.first_name,
        contact.data.last_name,
        contact.data.company_text,
        contact.data.origin,
      ]
        .filter(Boolean)
        .some((part) => part!.toLowerCase().includes(query));
    })
    .slice(0, 5);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          {...NO_PASSWORD_MANAGER_PROPS}
          placeholder="Kontakt suchen"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (disabled) return;
            const first = visible[0];
            if (first) onPick(first.id);
            else if (onCreate && value.trim()) onCreate();
          }}
          disabled={disabled}
        />
        {onCreate && (
          <Button
            type="button"
            size="icon"
            className="bg-[var(--brand)] text-white hover:opacity-90"
            disabled={!value.trim() || disabled}
            aria-label={createLabel}
            title={createLabel}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onCreate}
          >
            {disabled ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
        )}
      </div>
      {focused && (visible.length > 0 || query) && (
        <div className={`absolute left-0 ${onCreate ? "right-11" : "right-0"} top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg`}>
          {visible.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"
              onMouseDown={(event) => {
                event.preventDefault();
                if (disabled) return;
                onPick(contact.id);
              }}
            >
              <span className="block truncate">{contactDisplayName(contact)}</span>
              {contact.data.company_text && (
                <span className="block truncate text-xs text-[var(--muted-foreground)]">{contact.data.company_text}</span>
              )}
            </button>
          ))}
          {visible.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">Kein bestehender Kontakt gefunden</div>
          )}
        </div>
      )}
    </div>
  );
}

function BusinessPartnerLookupOverlay({
  businessPartner,
  onClose,
  onApply,
}: {
  businessPartner: BusinessPartnerData;
  onClose: () => void;
  onApply: (candidate: BusinessPartnerLookupCandidate) => void;
}) {
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<BusinessPartnerLookupCandidate[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    lookupBusinessPartnerRpu(businessPartner).then((result) => {
      if (cancelled) return;
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCandidates(result.lookup.candidates);
    });
    return () => {
      cancelled = true;
    };
  }, [businessPartner]);

  React.useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/25 p-4">
      <div className="grid max-h-[90vh] w-full max-w-4xl grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Search className="size-4 text-[var(--gp)]" />
            Unternehmensdaten suchen
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Schließen" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="min-h-0 overflow-auto p-4">
          {busy && (
            <div className="grid min-h-52 place-items-center text-[var(--muted-foreground)]">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm">
              {error}
            </div>
          )}
          {!busy && !error && candidates.length === 0 && (
            <div className="rounded-md border border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
              Keine passenden Unternehmensdaten gefunden.
            </div>
          )}
          <div className="grid gap-3">
            {candidates.map((candidate, index) => {
              const address = [
                candidate.address?.street,
                [candidate.address?.zip, candidate.address?.city].filter(Boolean).join(" "),
                candidate.address?.country,
              ].filter(Boolean).join(", ");
              return (
                <section key={`${candidate.company_name}-${index}`} className="grid gap-3 rounded-lg border border-[var(--border)] p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{candidate.company_name}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        Sicherheit: {Math.round(candidate.confidence * 100)}%
                      </div>
                    </div>
                    <Button type="button" onClick={() => onApply(candidate)}>
                      Übernehmen
                    </Button>
                  </div>
                  <div className="grid gap-1 text-sm">
                    {address && <div>{address}</div>}
                    {candidate.vat_id && <div>USt-ID: {candidate.vat_id}</div>}
                    {candidate.channels.length > 0 && (
                      <div className="text-[var(--muted-foreground)]">
                        {candidate.channels.map((channel) => `${channel.type}: ${channel.address}`).join(" · ")}
                      </div>
                    )}
                    {candidate.contacts_note && <div>Ansprechpartner: {candidate.contacts_note}</div>}
                  </div>
                  {candidate.sources.length > 0 && (
                    <div className="grid gap-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted-foreground)]">
                      {candidate.sources.map((source) => (
                        <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="truncate underline">
                          {source.title ? `${source.title} - ${source.url}` : source.url}
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
