import type { AppSettings, InvoicingAppSettings } from "../../model.js";
import { normalizeInvoicingSettings } from "../../invoicing-settings.js";
import type { AppSettingsProvider } from "../../pproviders/app-settings/app-settings-provider.js";

export interface UpdateAppSettingsCommand {
  user_id: string;
  invoicing: InvoicingAppSettings;
}

export type UpdateAppSettingsResult =
  | { ok: true; settings: AppSettings }
  | { ok: false; error: string };

export function updateAppSettings(deps: { appSettings: AppSettingsProvider }) {
  return async function process(command: UpdateAppSettingsCommand): Promise<UpdateAppSettingsResult> {
    if (!command.user_id?.trim()) return { ok: false, error: "Kein angemeldeter Benutzer." };
    const settings = await deps.appSettings.update({ invoicing: normalizeInvoicingSettings(command.invoicing) });
    return { ok: true, settings };
  };
}
