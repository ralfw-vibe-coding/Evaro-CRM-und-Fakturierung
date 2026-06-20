import type { AppSettings, InvoicingAppSettings } from "../../model.js";
import type { AppSettingsProvider } from "../../pproviders/app-settings/app-settings-provider.js";

export interface UpdateAppSettingsCommand {
  user_id: string;
  invoicing: InvoicingAppSettings;
}

export type UpdateAppSettingsResult =
  | { ok: true; settings: AppSettings }
  | { ok: false; error: string };

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalize(input: InvoicingAppSettings): InvoicingAppSettings {
  return {
    company_name: text(input.company_name),
    sender_address: text(input.sender_address),
    bank_details: text(input.bank_details),
    vat_number: text(input.vat_number),
    contact_person: text(input.contact_person),
    email: text(input.email),
    phone: text(input.phone),
    website: text(input.website),
  };
}

export function updateAppSettings(deps: { appSettings: AppSettingsProvider }) {
  return async function process(command: UpdateAppSettingsCommand): Promise<UpdateAppSettingsResult> {
    if (!text(command.user_id)) return { ok: false, error: "Kein angemeldeter Benutzer." };
    const settings = await deps.appSettings.update({ invoicing: normalize(command.invoicing ?? {}) });
    return { ok: true, settings };
  };
}
