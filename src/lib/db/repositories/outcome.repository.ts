import { apiGet, apiPost, apiPut } from "../../api";
import type { BetOutcomeRecord } from "../../contracts/db.contract";

export interface InsertBetOutcome {
    id: string;
    betId: string;
    outcomeId: string;
    odds: number;
    name: string;
    marketName: string;
    fixtureName: string;
    fixtureSlug: string;
    status: string;
    result: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): BetOutcomeRecord {
    return {
        id: row.id,
        betId: row.betId,
        outcomeId: row.outcomeId,
        odds: Number(row.odds),
        name: row.name,
        marketName: row.marketName,
        fixtureName: row.fixtureName,
        fixtureSlug: row.fixtureSlug,
        status: row.status as BetOutcomeRecord["status"],
        result: row.result,
    };
}

export async function createOutcome(outcome: InsertBetOutcome): Promise<void> {
    await apiPost("/api/outcomes", outcome);
}

export async function getOutcomesByBetId(betId: string): Promise<BetOutcomeRecord[]> {
    const rows = await apiGet<Array<Record<string, unknown>>>(`/api/outcomes/bet/${betId}`);
    return rows.map(rowToRecord);
}

export async function updateOutcomeStatus(
    id: string,
    status: string,
    result?: string
): Promise<void> {
    await apiPut(`/api/outcomes/${id}`, { status, result });
}
