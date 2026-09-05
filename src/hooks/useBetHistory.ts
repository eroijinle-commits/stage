import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BetHistoryRow } from "@/lib/contracts/ui.contract";
import { BetStatus, BetRecord } from "@/lib/contracts/db.contract";
import { getBets, getBetStats, getBetCount } from "@/lib/db/repositories/bet.repository";
import { getOutcomesByBetId } from "@/lib/db/repositories/outcome.repository";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { useUIStore } from "@/store/useUIStore";

function betToHistoryRow(
  bet: BetRecord,
  outcomes: Array<{
    marketName: string;
    fixtureName: string;
    name: string;
    odds: number;
    status: string;
    result: string | null;
  }>,
): BetHistoryRow {
  const matches =
    outcomes.length > 0 ? [...new Set(outcomes.map((o) => o.fixtureName))] : ["Unknown fixture"];
  const market = outcomes.length > 0 ? outcomes[0].marketName : "Unknown";
  const profit =
    bet.status === "won"
      ? Math.round(bet.amount * (bet.payoutMultiplier ?? bet.totalOdds - 1))
      : bet.status === "lost"
        ? -bet.amount
        : null;
  const returnAmount =
    bet.status === "won" ? Math.round(bet.amount * (bet.payoutMultiplier ?? bet.totalOdds)) : null;

  return {
    id: bet.id,
    date: new Date(bet.createdAt * 1000).toISOString(),
    matches,
    market,
    stake: bet.amount,
    totalOdds: bet.totalOdds,
    status: bet.status as BetStatus,
    return: returnAmount,
    profit,
    currency: bet.currency,
    outcomes: outcomes.map((o) => ({
      name: o.name,
      marketName: o.marketName,
      fixtureName: o.fixtureName,
      odds: o.odds,
      status: o.status as BetStatus,
      result: o.result,
    })),
  };
}

interface BetsResult {
  rows: BetHistoryRow[];
  totalCount: number;
}

const EMPTY_STATS = {
  totalBets: 0,
  totalWagered: 0,
  totalReturned: 0,
  winRate: 0,
  avgOdds: 0,
};

async function fetchBets(
  page: number,
  pageSize: number,
  status?: BetStatus,
): Promise<BetsResult> {
  const offset = (page - 1) * pageSize;
  const [dbBets, count] = await Promise.all([
    getBets({ limit: pageSize, offset, status }),
    getBetCount(),
  ]);

  const rows: BetHistoryRow[] = await Promise.all(
    dbBets.map(async (bet) => {
      const outcomes = await getOutcomesByBetId(bet.id);
      return betToHistoryRow(bet, outcomes);
    }),
  );

  return { rows, totalCount: count };
}

async function fetchStats() {
  return getBetStats();
}

export function useBetHistory() {
  const addToast = useUIStore((s) => s.addToast);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ status: BetStatus | null }>({ status: null });
  const pageSize = 20;

  const {
    data: betsData,
    isLoading: betsLoading,
    error: betsError,
    refetch: refetchBets,
  } = useQuery({
    queryKey: ["bets", { page, status: filter.status, pageSize }],
    queryFn: () => fetchBets(page, pageSize, filter.status ?? undefined),
    staleTime: 30_000,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["betStats"],
    queryFn: fetchStats,
    staleTime: 5 * 60_000,
  });

  const bets = betsData?.rows ?? [];
  const totalCount = betsData?.totalCount ?? 0;
  const isLoading = betsLoading || statsLoading;
  const error = betsError
    ? getUserFriendlyMessage(classifyError(betsError))
    : statsError
      ? getUserFriendlyMessage(classifyError(statsError))
      : null;

  // Error toasts (consistent with useBalance/useStakeApi pattern)
  useEffect(() => {
    if (betsError) {
      const message = getUserFriendlyMessage(classifyError(betsError));
      addToast({ type: "error", title: "Bet History", description: message, duration: 5000 });
    }
  }, [betsError, addToast]);

  useEffect(() => {
    if (statsError) {
      const message = getUserFriendlyMessage(classifyError(statsError));
      addToast({ type: "error", title: "Bet Stats", description: message, duration: 5000 });
    }
  }, [statsError, addToast]);

  // Filter changes reset page to 1 (mitigation: avoid stale page with new filter)
  const handleSetFilter = (f: { status: BetStatus | null }) => {
    setFilter(f);
    setPage(1);
  };

  const refetch = () => {
    refetchBets();
    refetchStats();
  };

  return {
    bets,
    isLoading,
    error,
    totalCount,
    page,
    pageSize,
    setPage,
    filter,
    setFilter: handleSetFilter,
    stats: stats ?? EMPTY_STATS,
    refetch,
  };
}
