import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BetSelection } from "@/lib/contracts/ui.contract";
import { SlipMode } from "@/lib/contracts/db.contract";
import { BetPlacementResult } from "@/lib/state/betPlacement";
import type { PoolFixture, ArchitectSlip, RuleSettings } from "@/lib/betarchitect/types";
import { generateFortress } from "@/lib/betarchitect/strategies/fortress";
import { generateGrowth } from "@/lib/betarchitect/strategies/growth";
import { generateUpside } from "@/lib/betarchitect/strategies/upside";
import { generateSystem78 } from "@/lib/betarchitect/strategies/system78";
import { DEFAULT_RULES } from "@/lib/betarchitect/rules";

/** A single betting slip. Every slip — manual, compute, saved — is first-class. */
export interface SlipData {
  id: string;
  name: string;
  selections: BetSelection[];
  mode: SlipMode;
  stakePerLeg: number;
  stakeShieldEnabled: boolean;
  isPlacing: boolean;
  placeResults: BetPlacementResult[];
  lastError: string | null;
  createdAt: number;
}

/** Legacy saved-slip snapshot. Only kept for localStorage migration. */
export interface SavedSlip {
  id: string;
  name: string;
  selections: BetSelection[];
  mode: SlipMode;
  stakePerLeg: number;
  createdAt: number;
}

export interface SlipShareData {
  code: string;
  link: string;
  stageLink: string;
}

interface SlipStore {
  slips: SlipData[];
  activeSlipId: string;

  // ── Slip lifecycle ──────────────────────────────────────────────────────
  createSlip: (name?: string) => string;
  switchSlip: (id: string) => void;
  deleteSlip: (id: string) => void;
  renameSlip: (id: string, name: string) => void;
  duplicateSlip: (id: string) => void;
  clearSlip: (id: string) => void;

  // ── Per-slip mutations (applied to active slip) ───────────────────────
  addSelection: (s: BetSelection) => void;
  addMultipleSelections: (selections: BetSelection[]) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  setMode: (mode: SlipMode) => void;
  setStakePerLeg: (stake: number) => void;
  setStakeShieldEnabled: (v: boolean) => void;
  setPlacing: (v: boolean) => void;
  setPlaceResults: (r: BetPlacementResult[]) => void;
  setLastError: (e: string | null) => void;
  updateOdds: (id: string, odds: number) => void;

  // ── Share / Restore ─────────────────────────────────────────────────────
  shareSlip: () => SlipShareData | null;
  restoreSlip: (encoded: string) => void;

  // ── Legacy compat (saved slips are now slips) ─────────────────────────
  savedSlips: SavedSlip[];
  saveSlip: (name: string) => void;
  loadSlip: (id: string) => void;
  deleteSavedSlip: (id: string) => void;

  // ── BetArchitect pool ──────────────────────────────────────────────────
  betArchitectPool: PoolFixture[];
  addToPool: (fixture: PoolFixture) => void;
  removeFromPool: (id: string) => void;
  clearPool: () => void;
  generateStrategies: (settings?: RuleSettings) => ArchitectSlip[];

  // ── BetArchitect persisted state ───────────────────────────────────────
  architectSlips: ArchitectSlip[];
  architectSettings: RuleSettings;
  architectExpertMode: boolean;
  architectOverrides: Partial<RuleSettings>;
  setArchitectSlips: (slips: ArchitectSlip[]) => void;
  setArchitectSettings: (settings: RuleSettings) => void;
  setArchitectExpertMode: (v: boolean) => void;
  setArchitectOverrides: (overrides: Partial<RuleSettings>) => void;
  clearArchitectSlips: () => void;
}

// Tracks whether the store has been rehydrated from localStorage.
let _slipRehydrated = false;
let _slipResolve: (() => void) | null = null;
export const slipHydrated = new Promise<void>((resolve) => {
  _slipResolve = resolve;
});

let _slipIdCounter = 0;

function createDefaultSlip(): SlipData {
  _slipIdCounter += 1;
  return {
    id: `slip-${Date.now()}-${_slipIdCounter}`,
    name: "Slip 1",
    selections: [],
    mode: "singles",
    stakePerLeg: 1000,
    stakeShieldEnabled: false,
    isPlacing: false,
    placeResults: [],
    lastError: null,
    createdAt: Date.now(),
  };
}

function createEmptySlip(name?: string, index = 1): SlipData {
  _slipIdCounter += 1;
  return {
    id: `slip-${Date.now()}-${_slipIdCounter}`,
    name: name?.trim() || `Slip ${index}`,
    selections: [],
    mode: "singles",
    stakePerLeg: 1000,
    stakeShieldEnabled: false,
    isPlacing: false,
    placeResults: [],
    lastError: null,
    createdAt: Date.now(),
  };
}

function cloneSlip(slip: SlipData, index: number): SlipData {
  _slipIdCounter += 1;
  return {
    ...slip,
    id: `slip-${Date.now()}-${_slipIdCounter}`,
    name: `${slip.name} (copy)`,
    selections: slip.selections.map((s) => ({ ...s })),
    isPlacing: false,
    placeResults: [],
    lastError: null,
    createdAt: Date.now(),
  };
}

export const useSlipStore = create<SlipStore>()(
  persist(
    (set, get) => ({
      slips: [createDefaultSlip()],
      activeSlipId: "",
      createSlip: (name) => {
        const nextIndex = get().slips.length + 1;
        const slip = createEmptySlip(name, nextIndex);
        set((st) => ({ slips: [...st.slips, slip], activeSlipId: slip.id }));
        return slip.id;
      },

      switchSlip: (id) => {
        const exists = get().slips.some((s) => s.id === id);
        if (exists) set({ activeSlipId: id });
      },

      deleteSlip: (id) => {
        set((st) => {
          if (st.slips.length <= 1) return {}; // keep at least one slip
          const nextSlips = st.slips.filter((s) => s.id !== id);
          const nextActive = st.activeSlipId === id ? (nextSlips[0]?.id ?? "") : st.activeSlipId;
          return { slips: nextSlips, activeSlipId: nextActive };
        });
      },

      renameSlip: (id, name) => {
        const trimmed = name.trim();
        set((st) => ({
          slips: st.slips.map((s) => (s.id === id ? { ...s, name: trimmed || s.name } : s)),
        }));
      },

      duplicateSlip: (id) => {
        const original = get().slips.find((s) => s.id === id);
        if (!original) return;
        const copy = cloneSlip(original, get().slips.length + 1);
        set((st) => ({ slips: [...st.slips, copy], activeSlipId: copy.id }));
      },

      clearSlip: (id) => {
        set((st) => ({
          slips: st.slips.map((s) =>
            s.id === id
              ? { ...s, selections: [], placeResults: [], lastError: null, isPlacing: false }
              : s,
          ),
        }));
      },

      addSelection: (s) => {
        // Reject selections with empty or whitespace-only outcome IDs.
        // The Stake API rejects non-UUID outcome IDs, causing silent bet failures.
        if (!s?.id || s.id.trim() === "") return;
        set((st) => ({
          slips: st.slips.map((slip) => {
            if (slip.id !== st.activeSlipId) return slip;
            const exists = slip.selections.find((x) => x.id === s.id);
            if (exists) {
              return {
                ...slip,
                selections: slip.selections.filter((x) => x.id !== s.id),
              };
            }
            return { ...slip, selections: [...slip.selections, s] };
          }),
        }));
      },

      addMultipleSelections: (newSelections) => {
        if (!newSelections || newSelections.length === 0) return;
        set((st) => ({
          slips: st.slips.map((slip) => {
            if (slip.id !== st.activeSlipId) return slip;
            const existingIds = new Set(slip.selections.map((x) => x.id));
            const toAdd = newSelections.filter(
              (s) => s && s.id && s.id.trim() !== "" && !existingIds.has(s.id),
            );
            if (toAdd.length === 0) return slip;
            return { ...slip, selections: [...slip.selections, ...toAdd] };
          }),
        }));
      },

      removeSelection: (id) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId
              ? { ...slip, selections: slip.selections.filter((x) => x.id !== id) }
              : slip,
          ),
        }));
      },

      clearSelections: () => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId
              ? { ...slip, selections: [], placeResults: [], lastError: null }
              : slip,
          ),
        }));
      },

      setMode: (mode) => {
        set((st) => ({
          slips: st.slips.map((slip) => (slip.id === st.activeSlipId ? { ...slip, mode } : slip)),
        }));
      },

      setStakePerLeg: (stakePerLeg) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId ? { ...slip, stakePerLeg } : slip,
          ),
        }));
      },

      setStakeShieldEnabled: (stakeShieldEnabled) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId ? { ...slip, stakeShieldEnabled } : slip,
          ),
        }));
      },

      setPlacing: (isPlacing) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId ? { ...slip, isPlacing } : slip,
          ),
        }));
      },

      setPlaceResults: (placeResults) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId ? { ...slip, placeResults } : slip,
          ),
        }));
      },

      setLastError: (lastError) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId ? { ...slip, lastError } : slip,
          ),
        }));
      },

      updateOdds: (id, odds) => {
        set((st) => ({
          slips: st.slips.map((slip) =>
            slip.id === st.activeSlipId
              ? {
                ...slip,
                selections: slip.selections.map((s) => (s.id === id ? { ...s, odds } : s)),
              }
              : slip,
          ),
        }));
      },

      shareSlip: () => {
        const active = get().slips.find((s) => s.id === get().activeSlipId);
        if (!active || active.selections.length === 0) return null;

        const first = active.selections[0];
        const stakeLink = first.stakeUrl ?? "";

        const payload = {
          v: 1,
          mode: active.mode,
          stakePerLeg: active.stakePerLeg,
          selections: active.selections.map((s) => ({
            id: s.id,
            fixtureSlug: s.fixtureSlug,
            fixtureName: s.fixtureName,
            fixtureId: s.fixtureId,
            tournamentName: s.tournamentName,
            marketId: s.marketId,
            marketName: s.marketName,
            outcomeId: s.outcomeId,
            outcomeName: s.outcomeName,
            odds: s.odds,
            active: s.active,
            startTime: s.startTime,
            betType: s.betType,
            betTypeLine: s.betTypeLine,
            sport: s.sport,
            stakeUrl: s.stakeUrl,
          })),
        };
        const base64 = btoa(JSON.stringify(payload));
        const stageLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?slip=${base64}`;

        return {
          code: first.fixtureSlug?.split("-")[0] ?? "",
          link: stakeLink,
          stageLink,
        };
      },

      restoreSlip: (encoded: string) => {
        try {
          const json = atob(encoded);
          const payload = JSON.parse(json) as {
            v: number;
            mode: SlipMode;
            stakePerLeg: number;
            selections: BetSelection[];
          };
          if (!payload.selections || payload.selections.length === 0) return;

          const newSlip: SlipData = {
            id: `slip-${Date.now()}-${++_slipIdCounter}`,
            name: "Restored slip",
            selections: payload.selections,
            mode: payload.mode ?? "singles",
            stakePerLeg: payload.stakePerLeg ?? 1000,
            stakeShieldEnabled: false,
            isPlacing: false,
            placeResults: [],
            lastError: null,
            createdAt: Date.now(),
          };

          set((st) => ({
            slips: [...st.slips, newSlip],
            activeSlipId: newSlip.id,
          }));
        } catch {
          // ignore malformed payloads
        }
      },

      savedSlips: [],
      saveSlip: (name: string) => {
        const active = get().slips.find((s) => s.id === get().activeSlipId);
        if (!active || active.selections.length === 0) return;
        const saved: SlipData = {
          ...cloneSlip(active, get().slips.length + 1),
          name: name.trim() || `${active.name} (saved)`,
        };
        set((st) => ({
          slips: [...st.slips, saved],
          activeSlipId: saved.id,
        }));
      },

      loadSlip: (id: string) => {
        get().switchSlip(id);
      },

      deleteSavedSlip: (id: string) => {
        get().deleteSlip(id);
      },

      // ── BetArchitect pool ──────────────────────────────────────────────
      betArchitectPool: [],

      addToPool: (fixture) =>
        set((st) => {
          if (st.betArchitectPool.some((f) => f.id === fixture.id)) return {};
          return { betArchitectPool: [...st.betArchitectPool, fixture] };
        }),

      removeFromPool: (id) =>
        set((st) => ({
          betArchitectPool: st.betArchitectPool.filter((f) => f.id !== id),
        })),

      clearPool: () => set({ betArchitectPool: [] }),

      generateStrategies: (settings = DEFAULT_RULES) => {
        const pool = get().betArchitectPool;
        return [
          ...generateFortress(pool, settings),
          ...generateGrowth(pool, settings),
          ...generateUpside(pool, settings),
          ...generateSystem78(pool, settings),
        ];
      },

      // ── BetArchitect persisted state ───────────────────────────────────
      architectSlips: [],
      architectSettings: DEFAULT_RULES,
      architectExpertMode: false,
      architectOverrides: {},

      setArchitectSlips: (slips) => set({ architectSlips: slips }),
      setArchitectSettings: (settings) => set({ architectSettings: settings }),
      setArchitectExpertMode: (v) => set({ architectExpertMode: v }),
      setArchitectOverrides: (overrides) => set({ architectOverrides: overrides }),
      clearArchitectSlips: () => set({ architectSlips: [] }),
    }),
    {
      name: "stake-slip-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        slips: state.slips.map((slip) => ({
          ...slip,
          // Strip selections with empty outcome IDs before persisting to localStorage.
          // The Stake API rejects non-UUID outcome IDs, causing silent bet failures.
          selections: slip.selections.filter((s) => s.id && s.id.trim() !== ""),
          isPlacing: false,
          placeResults: [],
          lastError: null,
        })),
        activeSlipId: state.activeSlipId,
        savedSlips: [],
        betArchitectPool: state.betArchitectPool,
        architectSlips: state.architectSlips,
        architectSettings: state.architectSettings,
        architectExpertMode: state.architectExpertMode,
        architectOverrides: state.architectOverrides,
      }),
      onRehydrateStorage: () => {
        return (state, _error) => {
          _slipRehydrated = true;
          _slipResolve?.();

          if (!state) return;

          // Migrate old format (selections / savedSlips) into unified slips.
          const anyState = state as any;
          const hasLegacyShape =
            Array.isArray(anyState.selections) || Array.isArray(anyState.savedSlips);

          if (!hasLegacyShape || (anyState.slips && anyState.slips.length > 0)) {
            // Strip selections with empty outcome IDs from rehydrated slips.
            // These are stale entries from before the fix that cause silent bet failures.
            const cleanedSlips = (anyState.slips ?? []).map((slip: any) => ({
              ...slip,
              selections: (slip.selections ?? []).filter(
                (s: any) => s.id && s.id.trim() !== "",
              ),
            }));
            if (cleanedSlips.length > 0 || anyState.slips?.length > 0) {
              useSlipStore.setState({
                slips: cleanedSlips.length > 0 ? cleanedSlips : [createDefaultSlip()],
                activeSlipId: state.activeSlipId ?? cleanedSlips[0]?.id ?? "default",
              });
            }
            return;
          }

          const migrated: SlipData[] = [];

          if (anyState.selections?.length > 0) {
            const validSelections = anyState.selections.filter(
              (s: any) => s.id && s.id.trim() !== "",
            );
            if (validSelections.length > 0) {
              migrated.push({
                id: `manual-${Date.now()}`,
                name: "Manual",
                selections: validSelections,
                mode: anyState.mode ?? "singles",
                stakePerLeg: anyState.stakePerLeg ?? 1000,
                stakeShieldEnabled: anyState.stakeShieldEnabled ?? false,
                isPlacing: false,
                placeResults: [],
                lastError: null,
                createdAt: Date.now(),
              });
            }
          }

          for (const ss of anyState.savedSlips ?? []) {
            const validSelections = (ss.selections ?? []).filter(
              (s: any) => s.id && s.id.trim() !== "",
            );
            migrated.push({
              id: ss.id,
              name: ss.name || "Saved slip",
              selections: validSelections,
              mode: ss.mode ?? "singles",
              stakePerLeg: ss.stakePerLeg ?? 1000,
              stakeShieldEnabled: false,
              isPlacing: false,
              placeResults: [],
              lastError: null,
              createdAt: ss.createdAt ?? Date.now(),
            });
          }

          if (migrated.length === 0) {
            migrated.push(createDefaultSlip());
          }

          useSlipStore.setState({ slips: migrated, activeSlipId: migrated[0].id, savedSlips: [] });
        };
      },
    },
  ),
);
