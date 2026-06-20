import type { AppSettings } from "../../model.js";
import type { AppSettingsProvider } from "../../pproviders/app-settings/app-settings-provider.js";

export type GetAppSettingsResult = { ok: true; settings: AppSettings } | { ok: false; error: string };

export function getAppSettings(deps: { appSettings: AppSettingsProvider }) {
  return async function process(): Promise<GetAppSettingsResult> {
    const settings = await deps.appSettings.get();
    return { ok: true, settings };
  };
}
