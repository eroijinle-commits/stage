import { useQuery } from "@tanstack/react-query";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui";
import { getBetById } from "@/lib/db/repositories/bet.repository";
import { getOutcomesByBetId } from "@/lib/db/repositories/outcome.repository";
import type { BetStatus } from "@/lib/contracts/db.contract";

const STATUS_VARIANT: Record<string, "success" | "error" | "warning" | "neutral" | "info"> = {
    won: "success",
    lost: "error",
    pending: "warning",
    cancelled: "neutral",
    cashout: "info",
    settled: "neutral",
    voided: "warning",
};

function calcProfit(status: BetStatus, amount: number, totalOdds: number, payoutMultiplier: number | null): number | null {
    if (status === "won") return Math.round(amount * (payoutMultiplier ?? totalOdds)) - amount;
    if (status === "lost") return -amount;
    return null;
}

interface SlipDetailModalProps {
    betId: string | null;
    onClose: () => void;
}

export default function SlipDetailModal({ betId, onClose }: SlipDetailModalProps) {
    const { data: bet, isLoading: betLoading } = useQuery({
        queryKey: ["slipDetail", betId],
        queryFn: () => getBetById(betId!),
        enabled: !!betId,
        staleTime: 30_000,
    });

    const { data: outcomes = [], isLoading: outcomesLoading } = useQuery({
        queryKey: ["slipOutcomes", betId],
        queryFn: () => getOutcomesByBetId(betId!),
        enabled: !!betId,
        staleTime: 30_000,
    });

    const loading = betLoading || outcomesLoading;

    return (
        <Modal open={!!betId} onClose={onClose} title="Slip Details" size="lg">
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : !bet ? (
                <p className="text-xs font-mono text-muted-foreground">Bet not found.</p>
            ) : (
                <div className="space-y-4">
                    {/* ─── Bet Header ─── */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                            <span className="text-muted-foreground">Date</span>
                            <p className="text-foreground mt-0.5">
                                {new Date(bet.createdAt * 1000).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status</span>
                            <p className="mt-0.5">
                                <Badge variant={STATUS_VARIANT[bet.status] ?? "neutral"} size="md">
                                    {bet.status}
                                </Badge>
                            </p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Stake</span>
                            <p className="text-foreground mt-0.5">
                                ₦{bet.amount.toLocaleString("en-NG")}
                            </p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Total Odds</span>
                            <p className="text-foreground mt-0.5">{bet.totalOdds.toFixed(2)}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Type</span>
                            <p className="text-foreground mt-0.5 capitalize">{bet.betType}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">P/L</span>
                            {(() => {
                                const profit = calcProfit(bet.status as BetStatus, bet.amount, bet.totalOdds, bet.payoutMultiplier);
                                return (
                                    <p className={`mt-0.5 font-medium ${profit === null ? "text-muted-foreground" : profit >= 0 ? "text-bet-won" : "text-bet-lost"}`}>
                                        {profit === null ? "—" : `${profit >= 0 ? "+" : ""}₦${profit.toLocaleString("en-NG")}`}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ─── Outcomes Table ─── */}
                    {outcomes.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Fixtures ({outcomes.length})
                            </h4>
                            <div className="border border-border rounded overflow-hidden">
                                <table className="w-full text-[10px] font-mono">
                                    <thead>
                                        <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                                            <th className="text-left px-3 py-2">Fixture</th>
                                            <th className="text-left px-3 py-2">Market</th>
                                            <th className="text-left px-3 py-2">Selection</th>
                                            <th className="text-right px-3 py-2">Odds</th>
                                            <th className="text-center px-3 py-2">Result</th>
                                            <th className="text-center px-3 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outcomes.map((o) => (
                                            <tr key={o.id} className="border-b border-border/50 last:border-0">
                                                <td className="px-3 py-2 text-foreground max-w-[180px] truncate">
                                                    {o.fixtureName}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">
                                                    {o.marketName}
                                                </td>
                                                <td className="px-3 py-2 text-foreground">
                                                    {o.name}
                                                </td>
                                                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                                                    {o.odds.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-center text-muted-foreground">
                                                    {o.result ?? "—"}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"} size="sm">
                                                        {o.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ─── Settlement Info ─── */}
                    {bet.settledAt && (
                        <p className="text-[10px] font-mono text-muted-foreground">
                            Settled:{" "}
                            {new Date(bet.settledAt * 1000).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
