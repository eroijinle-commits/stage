import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BetSelection } from "@/lib/contracts/ui.contract";
import { SlipMode } from "@/lib/contracts/db.contract";

export interface SavedSlip {
  id: string;
  name: string;
  selections: BetSelection[];
  mode: SlipMode;
  stakePerLeg: number;
  createdAt: number;
}

interface SlipStore {
  selections: BetSelection[];
  mode: SlipMode;
  stakePerLeg: number;
  isPlacing: boolean;
  placeResults: Array<{
    selectionId: string;
    success: boolean;
    betId?: string;
    error?: string;
    placedAt: number;
  }>;
  lastError: string | null;
  addSelection: (s: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  setMode: (mode: SlipMode) => void;
  setStakePerLeg: (stake: number) => void;
  setPlacing: (v: boolean) => void;
  setPlaceResults: (r: SlipStore["placeResults"]) => void;
  setLastError: (e: string | null) => void;
  updateOdds: (id: string, odds: number) => void;
  // Share: open fixture page on Stake.com
  shareSlip: () => string | null;
  // Save/load named snapshots
  savedSlips: SavedSlip[];
  saveSlip: (name: string) => void;
  loadSlip: (id: string) => void;
  deleteSlip: (id: string) => void;
}

export const useSlipStore = create<SlipStore>()(
  persist(
    (set, get) => ({
      selections: [],
      mode: "singles",
      stakePerLeg: 1000,
      isPlacing: false,
      placeResults: [],
      lastError: null,
      addSelection: (s) =>
        set((st) => {
          const exists = st.selections.find((x) => x.id === s.id);
          if (exists) return { selections: st.selections.filter((x) => x.id !== s.id) };
          return { selections: [...st.selections, s] };
        }),
      removeSelection: (id) =>
        set((st) => ({ selections: st.selections.filter((x) => x.id !== id) })),
      clearSelections: () =>
        set({ selections: [], placeResults: [], lastError: null }),
      setMode: (mode) => set({ mode }),
      setStakePerLeg: (stakePerLeg) => set({ stakePerLeg }),
      setPlacing: (isPlacing) => set({ isPlacing }),
      setPlaceResults: (placeResults) => set({ placeResults }),
      setLastError: (lastError) => set({ lastError }),
      updateOdds: (id, odds) =>
        set((st) => ({
          selections: st.selections.map((s) =>
            s.id === id ? { ...s, odds } : s,
          ),
        })),
      shareSlip: () => {
        const { selections } = get();
        const first = selections.find((s) => s.sport && s.fixtureSlug);
        if (!first) return null;
        return `https://stake.com/sports/${first.sport}/${first.fixtureSlug}`;
      },
      savedSlips: [],
      saveSlip: (name: string) => {
        const { selections, mode, stakePerLeg, savedSlips } = get();
        if (selections.length === 0) return;
        const slip: SavedSlip = {
          id: `slip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          selections: [...selections],
          mode,
          stakePerLeg,
          createdAt: Date.now(),
        };
        set({ savedSlips: [...savedSlips, slip] });
      },
      loadSlip: (id: string) => {
        const slip = get().savedSlips.find((s) => s.id === id);
        if (slip) {
          set({
            selections: [...slip.selections],
            mode: slip.mode,
            stakePerLeg: slip.stakePerLeg,
            placeResults: [],
            lastError: null,
          });
        }
      },
      deleteSlip: (id: string) => {
        set((st) => ({ savedSlips: st.savedSlips.filter((s) => s.id !== id) }));
      },
    }),
    {
      name: "stake-slip-storage",
      partialize: (state) => ({
        selections: state.selections,
        mode: state.mode,
        stakePerLeg: state.stakePerLeg,
        savedSlips: state.savedSlips,
      }),
    },
  ),
);
