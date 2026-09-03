import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import type { BetRecord } from "../../contracts/db.contract";

export interface InsertBet {
  id: string;
  amount: number;
  currency: string;
  status: string;
  betType: string;
  payoutMultiplier: number | null;
  potentialMultiplier: number;
  totalOdds: number;
  stakePerLeg: number | null;
  createdAt: number;
  settledAt: number | null;
  rawData: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): BetRecord {
  return {
    id: row.id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status as BetRecord["status"],
    betType: row.betType as BetRecord["betType"],
    payoutMultiplier: row.payoutMultiplier != null ? Number(row.payoutMultiplier) : null,
    potentialMultiplier: Number(row.potentialMultiplier),
    totalOdds: Number(row.totalOdds),
    stakePerLeg: row.stakePerLeg != null ? Number(row.stakePerLeg) : null,
    createdAt: row.createdAt,
    settledAt: row.settledAt,
    rawData: row.rawData,
  };
}

export async function createBet(bet: InsertBet): Promise<BetRecord> {
  await apiPost("/api/bets", bet);
  return {
    id: bet.id,
    amount: bet.amount,
    currency: bet.currency,
    status: bet.status as BetRecord["status"],
    betType: bet.betType as BetRecord["betType"],
    payoutMultiplier: bet.payoutMultiplier,
    potentialMultiplier: bet.potentialMultiplier,
    totalOdds: bet.totalOdds,
    stakePerLeg: bet.stakePerLeg,
    createdAt: bet.createdAt,
    settledAt: bet.settledAt,
    rawData: bet.rawData,
  };
}

export async function getBetById(id: string): Promise<BetRecord | null> {
  const row = await apiGet<Record<string, unknown> | null>(`/api/bets/${id}`);
  return row ? rowToRecord(row) : null;
}

export async function getBets(
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    dateFrom?: number;
    dateTo?: number;
  } = {},
): Promise<BetRecord[]> {
  const params = new URLSearchParams();
  const { limit = 50, offset = 0, status, dateFrom, dateTo } = options;
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (status) params.set("status", status);
  if (dateFrom != null) params.set("dateFrom", String(dateFrom));
  if (dateTo != null) params.set("dateTo", String(dateTo));
  const rows = await apiGet<Array<Record<string, unknown>>>(`/api/bets?${params}`);
  return rows.map(rowToRecord);
}

export async function getBetStats(): Promise<{
  totalBets: number;
  totalWagered: number;
  totalReturned: number;
  winRate: number;
  avgOdds: number;
}> {
  return apiGet("/api/bets/stats");
}

export async function updateBetStatus(
  id: string,
  status: string,
  payoutMultiplier?: number,
): Promise<void> {
  await apiPut(`/api/bets/${id}/status`, { status, payoutMultiplier });
}

export async function deleteBet(id: string): Promise<void> {
  await apiDelete(`/api/bets/${id}`);
}

export async function getBetCount(): Promise<number> {
  const data = await apiGet<{ count: number }>("/api/bets/count");
  return data.count;
}
