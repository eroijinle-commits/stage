import type { BetRecord } from "@/lib/contracts/db.contract";
import type { ExportOptions } from "@/lib/contracts/ui.contract";

/**
 * Export bets to CSV string.
 *
 * Columns: date, match, market, selection, odds, stake, status, return, profit
 */
export function exportToCSV(bets: BetRecord[], options: ExportOptions = {}): string {
    const { dateFrom, dateTo } = options;

    let filtered = bets;
    if (dateFrom || dateTo) {
        filtered = bets.filter((b) => {
            const ts = b.createdAt;
            if (dateFrom && ts < Math.floor(dateFrom.getTime() / 1000)) return false;
            if (dateTo && ts > Math.floor(dateTo.getTime() / 1000)) return false;
            return true;
        });
    }

    const header = "Date,Stake,Total Odds,Status,Payout,Profit,Currency";
    const rows = filtered.map((b) => {
        const date = new Date(b.createdAt * 1000).toISOString().split("T")[0];
        const payout =
            b.status === "won"
                ? Math.round(b.amount * (b.payoutMultiplier ?? b.totalOdds))
                : 0;
        const profit =
            b.status === "won"
                ? Math.round(b.amount * (b.payoutMultiplier ?? b.totalOdds)) - b.amount
                : b.status === "lost"
                    ? -b.amount
                    : 0;

        return [
            date,
            b.amount,
            b.totalOdds.toFixed(2),
            b.status,
            payout,
            profit,
            b.currency,
        ].join(",");
    });

    return [header, ...rows].join("\n");
}

/**
 * Export bets to JSON string with full fields.
 */
export function exportToJSON(bets: BetRecord[]): string {
    return JSON.stringify(bets, null, 2);
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(
    content: string,
    filename: string,
    mimeType: string,
): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
