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

/** Extract markets with outcomes from a Stake fixture details response. */
function extractOutcomes(
  details: Awaited<ReturnType<typeof getFixtureDetailsQuery>>,
): Array<{ name: string; odds: number; active: boolean }> | null {
  const markets = details.marketGroups.flatMap((g) =>
    g.templates.flatMap((t) => t.markets),
  );
  const firstMarket = markets[0];
  if (!firstMarket?.outcomes?.length) return null;
  return firstMarket.outcomes.map((o) => ({
    name: o.name,
    odds: o.odds,
    active: o.active,
  }));
}

/**
 * Enriches pool fixtures AND generated slip legs with full outcome data.
 * The discovery list API returns markets with empty outcomes; full outcome
 * data requires a separate fixture details call via getFixtureDetailsQuery.
 */
function useEnrichPoolFixtures() {
  const pool = useSlipStore((s) => s.betArchitectPool);
  const slips = useSlipStore((s) => s.architectSlips);
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    // Collect all fixture IDs that need enrichment (from pool + slip legs)
    const poolNeedIds = pool
      .filter((f) => !f.allOutcomes?.length && !fetchedRef.current.has(f.fixtureId))
      .map((f) => ({ id: f.fixtureId, slug: f.fixtureSlug || f.fixtureId }));

    const slipLegIds = new Set<string>();
    for (const slip of slips) {
      for (const leg of slip.legs) {
        if (!leg.allOutcomes?.length && !fetchedRef.current.has(leg.fixtureId)) {
          slipLegIds.add(leg.fixtureId);
        }
      }
    }
    const slipNeedIds = [...slipLegIds].map((id) => {
      // Find the leg to get its slug
      for (const slip of slips) {
        const leg = slip.legs.find((l) => l.fixtureId === id);
        if (leg) return { id, slug: leg.fixtureSlug || leg.fixtureId };
      }
      // Fallback: find in pool
      const pf = pool.find((f) => f.fixtureId === id);
      return { id, slug: pf?.fixtureSlug || id };
    });

    // Merge and deduplicate
    const allNeed = [...poolNeedIds];
    for (const sn of slipNeedIds) {
      if (!allNeed.some((n) => n.id === sn.id)) allNeed.push(sn);
    }

    if (allNeed.length === 0) return;
    console.log(`[BetArchitect enrich] ${allNeed.length} fixtures need enrichment:`, allNeed.map(n => n.id));

    let cancelled = false;

    (async () => {
      for (const { id, slug } of allNeed) {
        if (cancelled) break;
        fetchedRef.current.add(id);
        try {
          const details = await getFixtureDetailsQuery(slug);
          if (cancelled) break;

          const allOutcomes = extractOutcomes(details);
          if (!allOutcomes) {
            console.warn(`[BetArchitect enrich] No outcomes for ${id} (${slug})`);
            continue;
          }
          console.log(`[BetArchitect enrich] Enriched ${id}: ${allOutcomes.length} outcomes`);

          // Update pool fixture
          useSlipStore.setState((st) => ({
            betArchitectPool: st.betArchitectPool.map((pf) =>
              pf.fixtureId === id
                ? ({
                  ...pf,
                  allOutcomes,
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

          // Update slip legs that reference this fixture
          useSlipStore.setState((st) => ({
            architectSlips: st.architectSlips.map((slip) => ({
              ...slip,
              legs: slip.legs.map((leg) =>
                leg.fixtureId === id
                  ? ({
                    ...leg,
                    allOutcomes,
                    outcomeName: leg.outcomeName.includes(" or ")
                      ? allOutcomes[0]?.name ?? leg.outcomeName
                      : leg.outcomeName,
                    odds:
                      leg.odds === 1.5 && allOutcomes[0]?.odds
                        ? allOutcomes[0].odds
                        : leg.odds,
                  } satisfies PoolFixture)
                  : leg,
              ),
            })),
          }));
        } catch (err) {
          console.warn(`[BetArchitect enrich] Failed to enrich ${id}:`, err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pool, slips]);
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
