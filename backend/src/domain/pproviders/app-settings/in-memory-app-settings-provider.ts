import type { AppSettings } from "../../model.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";
import type { AppSettingsProvider, AppSettingsUpdate } from "./app-settings-provider.js";
import { normalizeInvoicingSettings } from "../../invoicing-settings.js";

function emptySettings(): AppSettings {
  return { invoicing: {}, updated_at: null };
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
      invoicing: normalizeInvoicingSettings(input.invoicing),
      updated_at: new Date().toISOString(),
    };
    writeDevState({ app_settings: this.settings });
    return structuredClone(this.settings);
  }
}
