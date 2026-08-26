import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BetSelection } from "@/lib/contracts/ui.contract";
import { SlipMode } from "@/lib/contracts/db.contract";

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
}

export const useSlipStore = create<SlipStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "stake-slip-storage",
      partialize: (state) => ({
        selections: state.selections,
        mode: state.mode,
        stakePerLeg: state.stakePerLeg,
      }),
    },
  ),
);
