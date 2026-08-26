import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OddsFormat } from "@/lib/contracts/db.contract";

interface SettingsStore {
  apiToken: string | null;
  currency: string;
  oddsFormat: OddsFormat;
  defaultPresetId: number | null;
  notifications: { betPlaced: boolean; betSettled: boolean; oddsChanged: boolean };
  theme: "dark" | "light" | "system";
  setApiToken: (token: string | null) => void;
  setCurrency: (c: string) => void;
  setOddsFormat: (f: OddsFormat) => void;
  setDefaultPresetId: (id: number | null) => void;
  setNotifications: (n: Partial<SettingsStore["notifications"]>) => void;
  setTheme: (t: "dark" | "light" | "system") => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiToken: null,
      currency: "NGN",
      oddsFormat: "decimal",
      defaultPresetId: null,
      notifications: { betPlaced: true, betSettled: true, oddsChanged: false },
      theme: "dark" as const,
      setApiToken: (apiToken) => set({ apiToken }),
      setCurrency: (currency) => set({ currency }),
      setOddsFormat: (oddsFormat) => set({ oddsFormat }),
      setDefaultPresetId: (defaultPresetId) => set({ defaultPresetId }),
      setNotifications: (n) =>
        set((st) => ({ notifications: { ...st.notifications, ...n } })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "stake-settings-storage",
    },
  ),
);
