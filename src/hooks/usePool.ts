/**
 * usePool — thin selector over the BetArchitect pool slice of useSlipStore.
 * Returns the current pool plus add/remove/clear helpers.
 * @module hooks/usePool
 */

import { useSlipStore } from "@/store/useSlipStore";

export function usePool() {
  const pool = useSlipStore((s) => s.betArchitectPool);
  const addToPool = useSlipStore((s) => s.addToPool);
  const removeFromPool = useSlipStore((s) => s.removeFromPool);
  const clearPool = useSlipStore((s) => s.clearPool);

  return { pool, addToPool, removeFromPool, clearPool };
}
