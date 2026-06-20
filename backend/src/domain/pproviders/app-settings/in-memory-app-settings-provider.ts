import type { AppSettings, InvoicingAppSettings } from "../../model.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";
import type { AppSettingsProvider, AppSettingsUpdate } from "./app-settings-provider.js";

function emptySettings(): AppSettings {
  return { invoicing: {}, updated_at: null };
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeInvoicing(value: InvoicingAppSettings): InvoicingAppSettings {
  return {
    company_name: normalizeText(value.company_name),
    sender_address: normalizeText(value.sender_address),
    bank_details: normalizeText(value.bank_details),
    vat_number: normalizeText(value.vat_number),
    contact_person: normalizeText(value.contact_person),
    email: normalizeText(value.email),
    phone: normalizeText(value.phone),
    website: normalizeText(value.website),
  };
}

export class InMemoryAppSettingsProvider implements AppSettingsProvider {
  private settings: AppSettings = emptySettings();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (!devStatePath()) return;
    this.settings = readDevState().app_settings ?? emptySettings();
  }

  async get(): Promise<AppSettings> {
    this.hydrate();
    return structuredClone(this.settings);
  }

  async update(input: AppSettingsUpdate): Promise<AppSettings> {
    this.hydrate();
    this.settings = {
      invoicing: normalizeInvoicing(input.invoicing),
      updated_at: new Date().toISOString(),
    };
    writeDevState({ app_settings: this.settings });
    return structuredClone(this.settings);
  }
}
