/**
 * Settings hook — bridges the Zustand settings store with the Neon DB repository.
 * On mount, loads settings from DB and hydrates the store.
 * On update, writes to both store and DB.
 * @module hooks/useSettings
 */

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/useSettingsStore";
import { SettingsState } from "@/lib/contracts/state.contract";
import { getSetting, setSetting } from "@/lib/db/repositories/settings.repository";

const SETTINGS_KEYS: Array<keyof SettingsState> = [
  "apiToken",
  "currency",
  "oddsFormat",
  "defaultPresetId",
  "notifications",
  "theme",
];

function parseSettingValue<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

// Module-level guard: ensure DB→Zustand hydration happens exactly once,
// even if the hook mounts/remounts multiple times.
let storeHydrated = false;

async function hydrateStoreFromDB() {
  if (storeHydrated) return true;

  const store = useSettingsStore.getState();
  const raw: Record<string, unknown> = {};

  for (const key of SETTINGS_KEYS) {
    const value = await getSetting(key);
    if (value !== null && value !== "null" && value !== "") {
      raw[key] = parseSettingValue(value, store[key as keyof typeof store]);
    }
  }

  // Apply loaded values to Zustand store.
  // For apiToken: only overwrite if the DB has a valid value AND
  // the store doesn't already have one from localStorage persist.
  // This prevents the DB (which may be empty on fresh install)
  // from clobbering the locally-persisted token.
  if (raw.apiToken !== undefined && raw.apiToken && !store.apiToken) {
    store.setApiToken(raw.apiToken as string);
  }
  if (raw.currency !== undefined) store.setCurrency(raw.currency as string);
  if (raw.oddsFormat !== undefined)
    store.setOddsFormat(raw.oddsFormat as SettingsState["oddsFormat"]);
  if (raw.defaultPresetId !== undefined)
    store.setDefaultPresetId(raw.defaultPresetId as number | null);
  if (raw.notifications !== undefined)
    store.setNotifications(raw.notifications as Partial<typeof store.notifications>);
  if (raw.theme !== undefined) store.setTheme(raw.theme as SettingsState["theme"]);

  storeHydrated = true;
  return true;
}

export function useSettings() {
  const store = useSettingsStore();

  // One-time hydration: staleTime: Infinity means React Query caches forever
  // and never refetches. The module-level flag is a safety net.
  const { isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: hydrateStoreFromDB,
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });

  const updateSettings = useCallback(
    async (partial: Partial<SettingsState>) => {
      // Update Zustand store immediately
      if (partial.apiToken !== undefined) store.setApiToken(partial.apiToken);
      if (partial.currency !== undefined) store.setCurrency(partial.currency);
      if (partial.oddsFormat !== undefined) store.setOddsFormat(partial.oddsFormat);
      if (partial.defaultPresetId !== undefined) store.setDefaultPresetId(partial.defaultPresetId);
      if (partial.notifications !== undefined) store.setNotifications(partial.notifications);
      if (partial.theme !== undefined) store.setTheme(partial.theme);

      // Persist to DB (non-blocking, best-effort)
      for (const [key, value] of Object.entries(partial)) {
        try {
          await setSetting(key, JSON.stringify(value));
        } catch {
          // Non-critical: settings save failure is silent
        }
      }
    },
    [store],
  );

  const settings: SettingsState = {
    apiToken: store.apiToken,
    currency: store.currency,
    oddsFormat: store.oddsFormat,
    defaultPresetId: store.defaultPresetId,
    notifications: store.notifications,
    theme: store.theme,
  };

  return {
    settings,
    updateSettings,
    isLoading,
  };
}
