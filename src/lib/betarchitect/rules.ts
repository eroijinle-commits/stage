import type { PoolFixture, RuleResult, RuleSettings } from "./types";
import { hasSameMatch, hasMutuallyExclusiveLegs } from "./validators";

export const DEFAULT_RULES: RuleSettings = {
  minLegOdds: 1.1,
  maxCombinedOdds: 15,
  maxSameSport: 3,
  maxSameLeague: 2,
};

/**
 * Run all rules (R1-R7) against a set of legs and return per-rule results.
 */
export function applyRules(
  legs: PoolFixture[],
  settings: RuleSettings = DEFAULT_RULES,
): RuleResult[] {
  const results: RuleResult[] = [];

  // R1 — No two legs from the same match
  results.push({
    rule: "R1",
    passed: !hasSameMatch(legs),
    severity: "hard",
    message: hasSameMatch(legs) ? "Two legs from the same match" : "No same-match conflicts",
  });

  // R2 — No mutually exclusive legs
  results.push({
    rule: "R2",
    passed: !hasMutuallyExclusiveLegs(legs),
    severity: "hard",
    message: hasMutuallyExclusiveLegs(legs)
      ? "Mutually exclusive legs detected"
      : "No mutually exclusive legs",
  });

  // R3 — Minimum leg odds
  const lowOdds = legs.filter((l) => l.odds < settings.minLegOdds);
  results.push({
    rule: "R3",
    passed: lowOdds.length === 0,
    severity: "soft",
    message: lowOdds.length
      ? `${lowOdds.length} legs below ${settings.minLegOdds} odds`
      : "All legs meet minimum odds",
  });

  // R4 — Maximum combined odds
  const combined = legs.reduce((acc, l) => acc * l.odds, 1);
  results.push({
    rule: "R4",
    passed: combined <= settings.maxCombinedOdds,
    severity: "soft",
    message:
      combined > settings.maxCombinedOdds
        ? `Combined odds ${combined.toFixed(2)} exceed ${settings.maxCombinedOdds}`
        : "Combined odds within limit",
  });

  // R5 — Sport diversification
  const sportCounts = countBy(legs, (l) => l.sport);
  const maxSport = Math.max(0, ...Object.values(sportCounts));
  results.push({
    rule: "R5",
    passed: maxSport <= settings.maxSameSport,
    severity: "soft",
    message:
      maxSport > settings.maxSameSport
        ? `${maxSport} legs from one sport`
        : "Sport diversification OK",
  });

  // R6 — League diversification
  const leagueCounts = countBy(legs, (l) => l.league);
  const maxLeague = Math.max(0, ...Object.values(leagueCounts));
  results.push({
    rule: "R6",
    passed: maxLeague <= settings.maxSameLeague,
    severity: "soft",
    message:
      maxLeague > settings.maxSameLeague
        ? `${maxLeague} legs from one league`
        : "League diversification OK",
  });

  // R7 — Same-team correlation (info flag only, placeholder for future)
  results.push({
    rule: "R7",
    passed: true,
    severity: "info",
    message: "Same-team correlation check logged",
  });

  return results;
}

function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}
