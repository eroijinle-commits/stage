/**
 * React hook for fetching the user's Stake account balance.
 * Uses the Stake API to retrieve balances by currency.
 * @module hooks/useBalance
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getBalance } from "@/lib/stake-api/auth";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { useUIStore } from "@/store/useUIStore";

interface BalanceData {
  currency: string;
  amount: number;
}

interface UseBalanceReturn {
  /** Current balance data, or null if not loaded */
  balance: BalanceData | null;
  /** Whether a fetch is in progress */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Trigger a manual refetch */
  refetch: () => void;
}

async function fetchBalanceData(currency: string): Promise<BalanceData | null> {
  const response = await getBalance(true, false);
  const target = currency.toLowerCase();
  const match = response.balances.find((b) => b.currency.toLowerCase() === target);
  if (match) {
    return { currency: match.currency, amount: parseFloat(match.available) || 0 };
  }
  // Fallback: pick the currency with the highest balance
  const sorted = [...response.balances].sort(
    (a, b) => (parseFloat(b.available) || 0) - (parseFloat(a.available) || 0),
  );
  const best = sorted[0];
  if (best && (parseFloat(best.available) || 0) > 0) {
    return { currency: best.currency, amount: parseFloat(best.available) || 0 };
  }
  return null;
}

/**
 * Hook that fetches and caches the user's account balance.
 * Automatically refetches when the API token changes.
 */
export function useBalance(): UseBalanceReturn {
  const apiToken = useSettingsStore((s) => s.apiToken);
  const currency = useSettingsStore((s) => s.currency);
  const addToast = useUIStore((s) => s.addToast);

  const { data: balance, isLoading, error: queryError, refetch: rawRefetch } = useQuery({
    queryKey: ["balance", apiToken, currency],
    queryFn: () => fetchBalanceData(currency),
    enabled: !!apiToken,
    staleTime: 30_000,
  });

  const error = queryError ? getUserFriendlyMessage(classifyError(queryError)) : null;

  // Error toasts via useEffect (React Query v5 pattern — no onError in useQuery)
  useEffect(() => {
    if (queryError) {
      const errType = classifyError(queryError);
      const message = getUserFriendlyMessage(errType);
      const isTransient = errType === "networkError" || errType === "rateLimited";
      addToast({
        type: "error",
        title: "Balance",
        description: message,
        duration: 5000,
        ...(isTransient ? { action: { label: "Retry", onClick: () => rawRefetch() } } : {}),
      });
    }
  }, [queryError, addToast, rawRefetch]);

  // Wrap refetch to return void (matches original interface)
  const refetch = () => { rawRefetch(); };

  // When no token, return explicit error state (matches original behavior)
  if (!apiToken) {
    return {
      balance: null,
      isLoading: false,
      error: "No API token configured",
      refetch,
    };
  }

  return {
    balance: balance ?? null,
    isLoading,
    error,
    refetch,
  };
}
