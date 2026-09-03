import { useState, useEffect, useCallback } from "react";
import { BetHistoryRow } from "@/lib/contracts/ui.contract";
import { BetStatus, BetRecord } from "@/lib/contracts/db.contract";
import { getBets, getBetStats, getBetCount } from "@/lib/db/repositories/bet.repository";
import { getOutcomesByBetId } from "@/lib/db/repositories/outcome.repository";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { useUIStore } from "@/store/useUIStore";

function betToHistoryRow(
  bet: BetRecord,
  outcomes: Array<{ marketName: string; fixtureName: string }>,
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
    status: bet.status,
    return: returnAmount,
    profit,
    currency: bet.currency,
  };
}

export function useBetHistory() {
  const addToast = useUIStore((s) => s.addToast);
  const [bets, setBets] = useState<BetHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ status: BetStatus | null }>({ status: null });
  const pageSize = 20;

  const [stats, setStats] = useState({
    totalBets: 0,
    totalWagered: 0,
    totalReturned: 0,
    winRate: 0,
    avgOdds: 0,
  });

  const fetchBets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const offset = (page - 1) * pageSize;
      const statusFilter = filter.status ?? undefined;

      const [dbBets, betStats, count] = await Promise.all([
        getBets({ limit: pageSize, offset, status: statusFilter }),
        getBetStats(),
        getBetCount(),
      ]);

      // Fetch outcomes for each bet to build history rows
      const rows: BetHistoryRow[] = await Promise.all(
        dbBets.map(async (bet) => {
          const outcomes = await getOutcomesByBetId(bet.id);
          return betToHistoryRow(bet, outcomes);
        }),
      );

      setBets(rows);
      setTotalCount(count);
      setStats(betStats);
    } catch (e) {
      const errType = classifyError(e);
      const message = getUserFriendlyMessage(errType);
      setError(message);
      addToast({ type: "error", title: "Bet History", description: message, duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, pageSize]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  return {
    bets,
    isLoading,
    error,
    totalCount,
    page,
    pageSize,
    setPage,
    filter,
    setFilter,
    stats,
    refetch: fetchBets,
  };
}
