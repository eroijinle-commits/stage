/**
 * React hook for Stake API connection management.
 * Provides connection status, loading state, and a test-connection function.
 * Reads the API token from localStorage and the Zustand settings store.
 * @module hooks/useStakeApi
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/useSettingsStore";
import { testConnection as testStakeConnection } from "@/lib/stake-api/auth";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { useUIStore } from "@/store/useUIStore";

interface UseStakeApiReturn {
  /** Whether a valid API connection has been confirmed */
  isConnected: boolean;
  /** Whether a connection test is in progress */
  isLoading: boolean;
  /** Error message if connection test failed */
  error: string | null;
  /** Trigger a connection test against the Stake API */
  testConnection: () => Promise<boolean>;
}

async function fetchConnection(): Promise<boolean> {
  const result = await testStakeConnection();
  return result;
}

/**
 * Hook that wraps API connection state.
 * Reads the token from the settings store and provides connection-testing logic.
 */
export function useStakeApi(): UseStakeApiReturn {
  const apiToken = useSettingsStore((s) => s.apiToken);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const {
    data: isConnected = false,
    isLoading,
    error: queryError,
    refetch: rawRefetch,
  } = useQuery({
    queryKey: ["stakeConnection", apiToken],
    queryFn: fetchConnection,
    enabled: !!apiToken,
    staleTime: 120_000,
    retry: 1,
  });

  const error = queryError ? getUserFriendlyMessage(classifyError(queryError)) : null;

  // Toast on error (consistent with useBalance pattern)
  useEffect(() => {
    if (queryError) {
      const errType = classifyError(queryError);
      const message = getUserFriendlyMessage(errType);
      const isTransient = errType === "networkError" || errType === "rateLimited";
      addToast({
        type: "error",
        title: "Connection",
        description: message,
        duration: 5000,
        ...(isTransient
          ? {
            action: {
              label: "Retry",
              onClick: () =>
                queryClient.refetchQueries({ queryKey: ["stakeConnection"] }),
            },
          }
          : {}),
      });
    }
  }, [queryError, addToast, queryClient]);

  const handleTestConnection = async (): Promise<boolean> => {
    if (!apiToken) {
      return false;
    }
    const result = await rawRefetch();
    return result.data ?? false;
  };

  // No token → return error state directly without depending on query
  if (!apiToken) {
    return {
      isConnected: false,
      isLoading: false,
      error: "No API token configured. Add one in Settings.",
      testConnection: handleTestConnection,
    };
  }

  return {
    isConnected: isConnected ?? false,
    isLoading,
    error,
    testConnection: handleTestConnection,
  };
}
