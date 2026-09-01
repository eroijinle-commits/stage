import { cn } from "@/lib/utils/cn";
import { Shield, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { getShieldFeeRate } from "@/lib/state/slipLogic";
import type { SlipMode } from "@/lib/contracts/db.contract";

interface ManualSummary {
    mode: SlipMode;
    selectionCount: number;
    currency: string;
    totalStake: number;
    displayReturn: number;
    potentialProfit: number;
    stakePerLeg: number;
    stakeShieldEnabled: boolean;
    totalOdds?: number;
}

interface ComputeSummary {
    slipCount: number;
    selectionCount: number;
    totalStake: number;
    totalReturn: number;
    currency: string;
}

interface SavedSummary {
    slipCount: number;
    selectionCount: number;
}

interface OrderPanelProps {
    open: boolean;
    onToggle: () => void;
    activeTab: "manual" | "compute" | "saved";
    manualSummary?: ManualSummary;
    computeSummary?: ComputeSummary;
    savedSummary?: SavedSummary;
    onStakeChange?: (value: number) => void;
    onStakeShieldToggle?: () => void;
    onPlaceBets?: () => void;
    onClear?: () => void;
    isPlacing?: boolean;
    placed?: boolean;
}

export default function OrderPanel({
    open,
    onToggle,
    activeTab,
    manualSummary,
    computeSummary,
    savedSummary,
    onStakeChange,
    onStakeShieldToggle,
    onPlaceBets,
    onClear,
    isPlacing,
    placed,
}: OrderPanelProps) {
    return (
        <div
            className={cn(
                "border-l border-border bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-200",
                open ? "w-56" : "w-8",
            )}
        >
            {open ? (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between h-7 px-2 border-b border-border shrink-0">
                        <span className="text-[11px] font-mono font-semibold uppercase tracking-wide">Order</span>
                        <button
                            onClick={onToggle}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                            title="Collapse panel"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {activeTab === "manual" && manualSummary && (
                            <ManualContent
                                summary={manualSummary}
                                onStakeChange={onStakeChange}
                                onStakeShieldToggle={onStakeShieldToggle}
                            />
                        )}
                        {activeTab === "compute" && computeSummary && <ComputeContent summary={computeSummary} />}
                        {activeTab === "saved" && savedSummary && <SavedContent summary={savedSummary} />}
                    </div>

                    {(activeTab === "manual" || activeTab === "compute") && onPlaceBets && onClear && (
                        <div className="p-2 border-t border-border shrink-0 space-y-1.5">
                            {!placed ? (
                                <Button
                                    variant="primary"
                                    fullWidth
                                    size="sm"
                                    onClick={onPlaceBets}
                                    loading={isPlacing}
                                    disabled={isPlacing}
                                >
                                    Place Bets
                                </Button>
                            ) : (
                                <Button variant="outline" fullWidth size="sm" onClick={onClear}>
                                    Clear Slip
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={onToggle}
                    className="h-full w-full flex items-start justify-center pt-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Expand panel"
                >
                    <ChevronLeft size={12} />
                </button>
            )}
        </div>
    );
}

function Section({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1.5">{children}</div>;
}

function Row({ label, value, valueClassName }: { label: string; value: string | number; valueClassName?: string }) {
    return (
        <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("tabular-nums", valueClassName)}>{value}</span>
        </div>
    );
}

function ManualContent({
    summary,
    onStakeChange,
    onStakeShieldToggle,
}: {
    summary: ManualSummary;
    onStakeChange?: (value: number) => void;
    onStakeShieldToggle?: () => void;
}) {
    const {
        mode, selectionCount, currency, totalStake, displayReturn, potentialProfit, stakePerLeg,
        stakeShieldEnabled, totalOdds,
    } = summary;

    return (
        <Section>
            <Row label="Mode" value={mode} valueClassName="text-foreground capitalize" />
            <Row label="Selections" value={selectionCount} valueClassName="text-foreground" />
            {mode === "parlay" && totalOdds !== undefined && (
                <Row label="Combined Odds" value={totalOdds.toFixed(2)} valueClassName="text-foreground" />
            )}

            <div className="border-t border-border" />

            {mode === "parlay" ? (
                <div className="space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground">Stake ({currency})</span>
                    <input
                        type="number"
                        value={stakePerLeg}
                        onChange={(e) => onStakeChange?.(parseFloat(e.target.value) || 0)}
                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-[11px] font-mono text-right focus:outline-none focus:border-ring"
                    />
                </div>
            ) : (
                <Row label="Total Stake" value={`${currency} ${totalStake.toLocaleString("en-NG")}`} valueClassName="text-foreground" />
            )}

            <Row
                label="Potential Return"
                value={`${currency} ${displayReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                valueClassName="text-primary font-semibold"
            />
            <Row
                label="Potential Profit"
                value={`${currency} ${potentialProfit.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                valueClassName={cn("font-semibold", potentialProfit >= 0 ? "text-bet-won" : "text-bet-lost")}
            />

            {mode === "parlay" && selectionCount >= 3 && onStakeShieldToggle && (
                <>
                    <div className="border-t border-border" />
                    <button
                        onClick={onStakeShieldToggle}
                        className={cn(
                            "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-mono transition-colors",
                            stakeShieldEnabled
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "text-muted-foreground hover:bg-muted border border-transparent",
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <Shield size={10} />
                            Stake Shield
                        </span>
                        <span className={cn(
                            "w-5 h-2.5 rounded-full transition-colors relative",
                            stakeShieldEnabled ? "bg-primary" : "bg-muted",
                        )}>
                            <span className={cn(
                                "absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-transform",
                                stakeShieldEnabled ? "translate-x-2.5" : "translate-x-0.5",
                            )} />
                        </span>
                    </button>
                    {stakeShieldEnabled && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                            Fee: {(getShieldFeeRate(selectionCount) * 100).toFixed(0)}%
                        </div>
                    )}
                </>
            )}
        </Section>
    );
}

function ComputeContent({ summary }: { summary: ComputeSummary }) {
    const { slipCount, selectionCount, totalStake, totalReturn, currency } = summary;
    const profit = totalReturn - totalStake;

    return (
        <Section>
            <Row label="Compute Slips" value={slipCount} valueClassName="text-foreground" />
            <Row label="Total Selections" value={selectionCount} valueClassName="text-foreground" />
            <div className="border-t border-border" />
            <Row label="Total Stake" value={`${currency} ${totalStake.toLocaleString("en-NG")}`} valueClassName="text-foreground" />
            <Row
                label="Total Return"
                value={`${currency} ${totalReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                valueClassName="text-primary font-semibold"
            />
            <Row
                label="Total Profit"
                value={`${currency} ${profit.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                valueClassName={cn("font-semibold", profit >= 0 ? "text-bet-won" : "text-bet-lost")}
            />
        </Section>
    );
}

function SavedContent({ summary }: { summary: SavedSummary }) {
    return (
        <Section>
            <Row label="Saved Slips" value={summary.slipCount} valueClassName="text-foreground" />
            <Row label="Total Selections" value={summary.selectionCount} valueClassName="text-foreground" />
        </Section>
    );
}
