import type { AppSettings, InvoicingAppSettings } from "../../model.js";

export interface AppSettingsUpdate {
  invoicing: InvoicingAppSettings;
}

export interface AppSettingsProvider {
  get(): Promise<AppSettings>;
  update(input: AppSettingsUpdate): Promise<AppSettings>;
}
