/**
 * useRules — manages rule settings and expert-mode toggle for BetArchitect.
 * Returns the current effective settings (defaults + overrides) and UI state.
 * @module hooks/useRules
 */

import { useState } from "react";
import type { RuleSettings } from "@/lib/betarchitect/types";
import { DEFAULT_RULES } from "@/lib/betarchitect/rules";

export function useRules() {
  const [settings, setSettings] = useState<RuleSettings>(DEFAULT_RULES);
  const [expertMode, setExpertMode] = useState(false);
  const [overrides, setOverrides] = useState<Partial<RuleSettings>>({});

  const effective: RuleSettings = { ...settings, ...overrides };

  return {
    settings,
    effective,
    expertMode,
    setExpertMode,
    setOverrides,
    setSettings,
  };
}
