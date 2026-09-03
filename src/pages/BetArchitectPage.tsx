/**
 * BetArchitectPage — main BetArchitect view.
 * Renders BetArchitectPanel; accepts activeSport / selectedTournamentSlugs
 * for SideNav compatibility (SideNav is rendered by App.tsx).
 *
 * Also runs a pool-enrichment effect: when pool fixtures have empty
 * allOutcomes (because the discovery list API doesn't return full
 * outcome data), it fetches fixture details from the Stake API and
 * populates the outcomes so SlipCard can display them properly.
 * @module pages/BetArchitectPage
 */

import { useEffect, useRef } from "react";
import BetArchitectPanel from "@/components/betarchitect/BetArchitectPanel";
import { useSlipStore } from "@/store/useSlipStore";
import { getFixtureDetailsQuery } from "@/lib/stake-api";
import type { PoolFixture } from "@/lib/betarchitect/types";

/**
 * Auto-enrich pool fixtures that are missing outcome data.
 * The discovery list API returns markets with empty outcomes;
 * full outcome data requires a separate fixture details call.
 */
function useEnrichPoolFixtures() {
  const pool = useSlipStore((s) => s.betArchitectPool);
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const needsEnrichment = pool.filter(
      (f) =>
        !f.allOutcomes?.length && !fetchedRef.current.has(f.fixtureId),
    );
    if (needsEnrichment.length === 0) return;

    let cancelled = false;

    (async () => {
      for (const fixture of needsEnrichment) {
        if (cancelled) break;
        fetchedRef.current.add(fixture.fixtureId);
        try {
          const slug = fixture.fixtureSlug || fixture.fixtureId;
          const details = await getFixtureDetailsQuery(slug);
          if (cancelled) break;

          // Markets live inside marketGroups → templates → markets
          const markets = details.marketGroups.flatMap((g) =>
            g.templates.flatMap((t) => t.markets),
          );
          const firstMarket = markets[0];
          if (!firstMarket?.outcomes?.length) continue;

          const allOutcomes = firstMarket.outcomes.map((o) => ({
            name: o.name,
            odds: o.odds,
            active: o.active,
          }));

          // Update the pool fixture in the store with enriched data
          useSlipStore.setState((st) => ({
            betArchitectPool: st.betArchitectPool.map((pf) =>
              pf.fixtureId === fixture.fixtureId
                ? ({
                  ...pf,
                  allOutcomes,
                  // Also fix outcomeName/odds if they were fallbacks
                  outcomeName: pf.outcomeName.includes(" or ")
                    ? allOutcomes[0]?.name ?? pf.outcomeName
                    : pf.outcomeName,
                  odds:
                    pf.odds === 1.5 && allOutcomes[0]?.odds
                      ? allOutcomes[0].odds
                      : pf.odds,
                } satisfies PoolFixture)
                : pf,
            ),
          }));
        } catch {
          // Silently skip — enrichment is best-effort
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pool]);
}

export default function BetArchitectPage({
  activeSport,
  selectedTournamentSlugs = [],
}: {
  activeSport?: string;
  selectedTournamentSlugs?: string[];
}) {
  useEnrichPoolFixtures();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <BetArchitectPanel />
    </div>
  );
}
