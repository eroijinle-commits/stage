import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { calculatePotentialReturn, calculateTotalStake, getShieldFeeRate } from "@/lib/state/slipLogic";
import { ChevronDown, ChevronRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { useState, useMemo } from "react";
import type { ComputeSlipEntry } from "@/store/useSlipStore";

interface ComputeSlipTableProps {
    slips: ComputeSlipEntry[];
    currency: string;
    onRemove: (id: string) => void;
    onPlaceBets: (id: string) => void;
}

function getCanParlay(selections: ComputeSlipEntry["selections"]): boolean {
    const counts = new Map<string, number>();
    for (const s of selections) counts.set(s.fixtureId, (counts.get(s.fixtureId) ?? 0) + 1);
    return Math.max(...counts.values(), 0) <= 1;
}

function getOddsClass(odds: number): string {
    if (odds >= 2) return "text-bet-won";
    if (odds < 1.5) return "text-bet-lost";
    return "text-odds-stable";
}

export default function ComputeSlipTable({ slips, currency, onRemove, onPlaceBets }: ComputeSlipTableProps) {
    const updateComputeSlip = useSlipStore((s) => s.updateComputeSlip);

    if (slips.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-muted-foreground gap-2">
                <AlertCircle size={18} className="text-muted-foreground/50" />
                <span>No compute slips. Generate permutations from the Compute panel.</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-2 space-y-2">
            {slips.map((slip) => (
                <ComputeSlipRow
                    key={slip.id}
                    slip={slip}
                    currency={currency}
                    onRemove={() => onRemove(slip.id)}
                    onPlaceBets={() => onPlaceBets(slip.id)}
                    updateComputeSlip={updateComputeSlip}
                />
            ))}
        </div>
    );
}

function ComputeSlipRow({
    slip,
    currency,
    onRemove,
    onPlaceBets,
    updateComputeSlip,
}: {
    slip: ComputeSlipEntry;
    currency: string;
    onRemove: () => void;
    onPlaceBets: () => void;
    updateComputeSlip: (id: string, patch: Partial<Pick<ComputeSlipEntry, "mode" | "stakePerLeg" | "stakeShieldEnabled">>) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const canParlay = useMemo(() => getCanParlay(slip.selections), [slip.selections]);

    const totalOdds = slip.selections.reduce((acc, s) => acc * s.odds, 1);
    const potentialReturn = calculatePotentialReturn(slip.selections, slip.mode, slip.stakePerLeg, undefined, slip.stakeShieldEnabled);
    const totalStake = calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
    const placed = slip.placeResults.length > 0;

    return (
        <div className="border border-border/60 rounded overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-secondary/30 border-b border-border/60">
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground hover:text-primary transition-colors"
                >
                    {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    <span className="truncate max-w-[240px]">{slip.name}</span>
                    <span className="text-muted-foreground font-normal">({slip.selections.length} legs)</span>
                </button>
                <button
                    onClick={onRemove}
                    className="text-muted-foreground hover:text-bet-lost transition-colors p-0.5"
                    title="Remove slip"
                >
                    <X size={11} />
                </button>
            </div>

            {expanded && (
                <>
                    {/* Mode toggle */}
                    <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border/60">
                        {(["singles", "parlay"] as const).map((m) => {
                            const disabled = m === "parlay" && !canParlay;
                            return (
                                <button
                                    key={m}
                                    disabled={disabled}
                                    onClick={() => {
                                        if (disabled) return;
                                        updateComputeSlip(slip.id, {
                                            mode: m,
                                            stakeShieldEnabled: m !== "parlay" ? false : slip.stakeShieldEnabled,
                                        });
                                    }}
                                    title={disabled ? "Parlays cannot combine selections from the same match" : undefined}
                                    className={cn(
                                        "flex-1 py-0.5 text-[11px] font-mono rounded transition-colors capitalize",
                                        slip.mode === m
                                            ? "bg-primary/15 text-primary"
                                            : disabled
                                                ? "text-muted-foreground/30 cursor-not-allowed"
                                                : "text-muted-foreground hover:bg-muted",
                                    )}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>

                    {/* Stake Shield */}
                    {slip.mode === "parlay" && slip.selections.length >= 3 && (
                        <div className="px-2.5 py-1 border-b border-border/60">
                            <button
                                onClick={() => updateComputeSlip(slip.id, { stakeShieldEnabled: !slip.stakeShieldEnabled })}
                                className={cn(
                                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-mono transition-colors",
                                    slip.stakeShieldEnabled
                                        ? "bg-primary/10 text-primary border border-primary/30"
                                        : "text-muted-foreground hover:bg-muted border border-transparent",
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span>Stake Shield</span>
                                </span>
                                <span className={cn(
                                    "w-6 h-3 rounded-full transition-colors relative",
                                    slip.stakeShieldEnabled ? "bg-primary" : "bg-muted",
                                )}>
                                    <span className={cn(
                                        "absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform",
                                        slip.stakeShieldEnabled ? "translate-x-3" : "translate-x-0.5",
                                    )} />
                                </span>
                            </button>
                            {slip.stakeShieldEnabled && (
                                <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                                    Fee: {(getShieldFeeRate(slip.selections.length) * 100).toFixed(0)}%
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selections table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono">
                            <thead className="bg-card/50 border-b border-border/60">
                                <tr className="text-muted-foreground">
                                    <th className="text-left px-2.5 py-1 font-medium">Fixture</th>
                                    <th className="text-left px-2 py-1 font-medium">Selection</th>
                                    <th className="text-right px-2 py-1 font-medium">Odds</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {slip.selections.map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-2.5 py-1 min-w-[160px]">
                                            <p className="text-foreground truncate max-w-[180px]">{s.fixtureName}</p>
                                        </td>
                                        <td className="px-2 py-1 min-w-[140px]">
                                            <p className="text-foreground truncate max-w-[160px]">{s.outcomeName}</p>
                                            <p className="text-muted-foreground truncate max-w-[160px]">{s.marketName}</p>
                                        </td>
                                        <td className="px-2 py-1 text-right">
                                            <span className={cn("font-semibold tabular-nums", getOddsClass(s.odds))}>
                                                {s.odds.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="px-2.5 py-2 border-t border-border/60 space-y-1.5">
                        {slip.mode === "parlay" && (
                            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                <span>Total Odds</span>
                                <span className="text-foreground tabular-nums">{totalOdds.toFixed(2)}</span>
                            </div>
                        )}
                        {slip.mode === "parlay" && (
                            <input
                                type="number"
                                value={slip.stakePerLeg}
                                onChange={(e) => updateComputeSlip(slip.id, { stakePerLeg: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-secondary border border-border rounded px-2 py-1 text-[11px] font-mono text-right focus:outline-none focus:border-ring"
                            />
                        )}
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                            <span>Total Stake</span>
                            <span className="text-foreground tabular-nums">
                                {currency} {totalStake.toLocaleString("en-NG")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono font-semibold">
                            <span className="text-muted-foreground">Potential Return</span>
                            <span className="text-primary tabular-nums">
                                {currency} {potentialReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        {slip.lastError && (
                            <div className="text-[11px] font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-2 py-1">
                                {slip.lastError}
                            </div>
                        )}
                        {!placed ? (
                            <Button
                                variant="primary"
                                fullWidth
                                size="sm"
                                onClick={onPlaceBets}
                                loading={slip.isPlacing}
                                disabled={slip.isPlacing || slip.selections.length === 0}
                            >
                                {slip.isPlacing ? "Placing..." : "Place Bet"}
                            </Button>
                        ) : (
                            <div className={cn(
                                "text-[11px] font-mono text-center py-1",
                                slip.placeResults.some((r) => r.success) ? "text-bet-won" : "text-bet-lost",
                            )}>
                                {slip.placeResults.some((r) => r.success)
                                    ? `Placed · ${slip.placeResults.filter((r) => r.success).length} bet(s) successful`
                                    : "Bet placement failed"}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
