/**
 * useRules — manages rule settings and expert-mode toggle for BetArchitect.
 * Reads/writes from the persisted Zustand store so settings survive refresh.
 * @module hooks/useRules
 */

import { useCallback, useMemo } from "react";
import type { RuleSettings } from "@/lib/betarchitect/types";
import { useSlipStore } from "@/store/useSlipStore";

export function useRules() {
  const settings = useSlipStore((s) => s.architectSettings);
  const expertMode = useSlipStore((s) => s.architectExpertMode);
  const overrides = useSlipStore((s) => s.architectOverrides);
  const setArchitectSettings = useSlipStore((s) => s.setArchitectSettings);
  const setArchitectExpertMode = useSlipStore((s) => s.setArchitectExpertMode);
  const setArchitectOverrides = useSlipStore((s) => s.setArchitectOverrides);

  const effective: RuleSettings = useMemo(
    () => ({ ...settings, ...overrides }),
    [settings, overrides],
  );

  const setSettings = useCallback(
    (s: RuleSettings) => setArchitectSettings(s),
    [setArchitectSettings],
  );

  const setExpertMode = useCallback(
    (v: boolean) => setArchitectExpertMode(v),
    [setArchitectExpertMode],
  );

  const setOverrides = useCallback(
    (o: Partial<RuleSettings>) => setArchitectOverrides(o),
    [setArchitectOverrides],
  );

  return {
    settings,
    effective,
    expertMode,
    setExpertMode,
    setOverrides,
    setSettings,
  };
}
