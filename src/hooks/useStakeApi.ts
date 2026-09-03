/**
 * React hook for Stake API connection management.
 * Provides connection status, loading state, and a test-connection function.
 * Reads the API token from localStorage and the Zustand settings store.
 * @module hooks/useStakeApi
 */

import { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { testConnection } from "@/lib/stake-api/auth";

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

/**
 * Hook that wraps API connection state.
 * Reads the token from the settings store and provides connection-testing logic.
 */
export function useStakeApi(): UseStakeApiReturn {
  const apiToken = useSettingsStore((s) => s.apiToken);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-test connection when token changes
  useEffect(() => {
    if (apiToken) {
      handleTestConnection();
    } else {
      setIsConnected(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken]);

  const handleTestConnection = useCallback(async (): Promise<boolean> => {
    if (!apiToken) {
      setIsConnected(false);
      setError("No API token configured. Add one in Settings.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await testConnection();
      setIsConnected(result);
      if (!result) {
        setError("Connection failed. Check your token and try again.");
      }
      return result;
    } catch (err) {
      setIsConnected(false);
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiToken]);

  return {
    isConnected,
    isLoading,
    error,
    testConnection: handleTestConnection,
  };
}
