/**
 * Settlement sync service.
 * Polls the Stake API for bet status changes and updates the local DB.
 * Only syncs bets that are still "pending" in the local database.
 * @module lib/sync/settlementSync
 */

import { getBets, updateBetStatus } from "@/lib/db/repositories/bet.repository";
import { getOutcomesByBetId, updateOutcomeStatus } from "@/lib/db/repositories/outcome.repository";
import { getBetHistoryQuery } from "@/lib/stake-api/queries";

const SYNC_BATCH_SIZE = 50;

export interface SyncResult {
    checked: number;
    updated: number;
    errors: number;
}

/**
 * Fetch pending bets from local DB, query Stake API for their current status,
 * and update local DB for any bets that have been settled.
 *
 * Returns a summary of what changed. Never throws — errors are counted per-bet.
 */
export async function syncPendingBets(): Promise<SyncResult> {
    const result: SyncResult = { checked: 0, updated: 0, errors: 0 };

    try {
        // 1. Get all pending bets from local DB
        const pendingBets = await getBets({ status: "pending", limit: SYNC_BATCH_SIZE });
        if (pendingBets.length === 0) return result;

        result.checked = pendingBets.length;

        // 2. Query Stake API for recent bet history (includes settled bets)
        // Fetch a broad window to catch any that may have settled
        let apiBets: Awaited<ReturnType<typeof getBetHistoryQuery>>["bets"] = [];
        try {
            const apiResult = await getBetHistoryQuery(100, 0);
            apiBets = apiResult.bets;
        } catch {
            // Stake API unavailable — skip this sync cycle
            console.warn("[settlementSync] Stake API unavailable, skipping sync");
            return result;
        }

        // Build a lookup map: Stake bet ID → API bet data
        const apiBetMap = new Map(apiBets.map((b) => [b.id, b]));

        for (const bet of pendingBets) {
            const apiBet = apiBetMap.get(bet.id);
            if (!apiBet) continue; // not found in API response
            if (apiBet.status === "pending") continue; // still pending on Stake side

            try {
                // 3. Update bet status in local DB
                await updateBetStatus(
                    bet.id,
                    apiBet.status,
                    apiBet.payoutMultiplier ?? undefined,
                );

                // 4. Update each outcome's status and result
                if (apiBet.outcomes && apiBet.outcomes.length > 0) {
                    const localOutcomes = await getOutcomesByBetId(bet.id);

                    for (const localOutcome of localOutcomes) {
                        // Match by outcomeId (the Stake outcome UUID stored locally)
                        const apiOutcome = apiBet.outcomes.find(
                            (o) => o.id === localOutcome.outcomeId,
                        );
                        if (apiOutcome && apiOutcome.status !== localOutcome.status) {
                            await updateOutcomeStatus(
                                localOutcome.id,
                                apiOutcome.status,
                                apiOutcome.result ?? undefined,
                            );
                        }
                    }
                }

                result.updated++;
            } catch (err) {
                console.error(`[settlementSync] Failed to sync bet ${bet.id}:`, err);
                result.errors++;
            }
        }
    } catch (err) {
        console.error("[settlementSync] Top-level error:", err);
        result.errors++;
    }

    return result;
}
