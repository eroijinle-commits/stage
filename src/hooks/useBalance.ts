/**
 * React hook for fetching the user's Stake account balance.
 * Uses the Stake API to retrieve balances by currency.
 * @module hooks/useBalance
 */

import { useState, useEffect, useCallback } from "react";
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
  refetch: () => Promise<void>;
}

/**
 * Hook that fetches and caches the user's account balance.
 * Automatically refetches when the API token changes.
 */
export function useBalance(): UseBalanceReturn {
  const apiToken = useSettingsStore((s) => s.apiToken);
  const currency = useSettingsStore((s) => s.currency);
  const addToast = useUIStore((s) => s.addToast);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<void> => {
    if (!apiToken) {
      setBalance(null);
      setError("No API token configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getBalance(true, false);
      // Normalize for case-insensitive comparison (API returns lowercase)
      const target = currency.toLowerCase();
      // Find the balance matching the user's preferred currency
      const match = response.balances.find((b) => b.currency.toLowerCase() === target);
      if (match) {
        setBalance({
          currency: match.currency,
          amount: parseFloat(match.available) || 0,
        });
      } else {
        // Fallback: pick the currency with the highest balance
        const sorted = [...response.balances].sort(
          (a, b) => (parseFloat(b.available) || 0) - (parseFloat(a.available) || 0),
        );
        const best = sorted[0];
        if (best && (parseFloat(best.available) || 0) > 0) {
          setBalance({
            currency: best.currency,
            amount: parseFloat(best.available) || 0,
          });
        } else {
          setBalance(null);
        }
      }
    } catch (err) {
      const errType = classifyError(err);
      const message = getUserFriendlyMessage(errType);
      setError(message);
      setBalance(null);
      const isTransient = errType === "networkError" || errType === "rateLimited";
      addToast({
        type: "error",
        title: "Balance",
        description: message,
        duration: 5000,
        ...(isTransient ? { action: { label: "Retry", onClick: () => fetchBalance() } } : {}),
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiToken, currency, addToast]);

  // Auto-fetch when token or currency changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
