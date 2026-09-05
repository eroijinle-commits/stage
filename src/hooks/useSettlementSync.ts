/**
 * React hook that periodically syncs pending bet statuses from the Stake API.
 * Runs every 60s and invalidates bet/analytics queries when changes are detected.
 * @module hooks/useSettlementSync
 */

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";
import { syncPendingBets } from "@/lib/sync/settlementSync";

const SYNC_INTERVAL = 60_000; // 60 seconds

async function runSync(): Promise<number> {
    const result = await syncPendingBets();
    return result.updated;
}

/**
 * Mount this hook once (e.g. in App.tsx) to enable automatic settlement polling.
 * Only activates when an API token is configured.
 */
export function useSettlementSync() {
    const apiToken = useSettingsStore((s) => s.apiToken);
    const addToast = useUIStore((s) => s.addToast);
    const queryClient = useQueryClient();
    const prevUpdatedRef = useRef(0);

    const { data: updatedCount = 0 } = useQuery({
        queryKey: ["settlementSync"],
        queryFn: runSync,
        enabled: !!apiToken,
        refetchInterval: SYNC_INTERVAL,
        staleTime: SYNC_INTERVAL - 5_000, // slightly less than refetch interval
        retry: 1,
        throwOnError: false,
    });

    // When updatedCount changes (bets were settled), invalidate related queries
    useEffect(() => {
        if (updatedCount > 0 && updatedCount !== prevUpdatedRef.current) {
            prevUpdatedRef.current = updatedCount;
            queryClient.invalidateQueries({ queryKey: ["bets"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["betStats"] });
            addToast({
                type: "success",
                title: "Settlement Sync",
                description: `${updatedCount} bet${updatedCount > 1 ? "s" : ""} settled.`,
                duration: 4000,
            });
        }
    }, [updatedCount, queryClient, addToast]);
}
