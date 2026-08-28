/**
 * MarketBrowser — modal/slide-over that shows all markets for a fixture.
 * Fetches full market details via FixturePage_SlugFixture query.
 * @module components/discovery/MarketBrowser
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, Button, Badge, OddsButton } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import { getFixtureDetailsQuery, type FixtureDetailsData } from "@/lib/stake-api/queries";
import { useSlipStore } from "@/store/useSlipStore";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, ChevronRight, Radio, Zap } from "lucide-react";

interface MarketBrowserProps {
    open: boolean;
    onClose: () => void;
    fixture: DiscoveryFixture | null;
    sportSlug?: string;
}

export default function MarketBrowser({ open, onClose, fixture, sportSlug }: MarketBrowserProps) {
    const [details, setDetails] = useState<FixtureDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const addSelection = useSlipStore((s) => s.addSelection);
    const selectionIds = useSlipStore((s) => s.selections.map((x) => x.id).join(","));
    const slipIds = useMemo(() => new Set(selectionIds ? selectionIds.split(",") : []), [selectionIds]);
    const addToast = useUIStore((s) => s.addToast);

    const fetchDetails = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getFixtureDetailsQuery(id, ["main", "goals", "corners", "cards"], sportSlug);
            setDetails(data);
            // Auto-expand first group
            if (data.marketGroups.length > 0) {
                setExpandedGroups(new Set([data.marketGroups[0].name]));
            }
        } catch (e) {
            setError(`Failed to load markets${e instanceof Error ? `: ${e.message}` : ""}`);
            setDetails(null);
        } finally {
            setIsLoading(false);
        }
    }, [sportSlug]);

    useEffect(() => {
        if (open && fixture?.id) {
            fetchDetails(fixture.id);
        }
        return () => {
            setDetails(null);
            setError(null);
            setExpandedGroups(new Set());
        };
    }, [open, fixture?.id, fetchDetails]);

    // Keyboard: Escape to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const toggleGroup = (name: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const expandAll = () => {
        if (details) setExpandedGroups(new Set(details.marketGroups.map((g) => g.name)));
    };

    const collapseAll = () => setExpandedGroups(new Set());

    const handleAddOutcome = (
        outcomeId: string,
        outcomeName: string,
        odds: number,
        active: boolean,
        marketName: string,
    ) => {
        if (!fixture || !active) return;
        addSelection({
            id: outcomeId,
            fixtureSlug: fixture.slug,
            fixtureName: fixture.name,
            fixtureId: fixture.id,
            tournamentName: fixture.tournament.name,
            marketId: `${fixture.id}-${marketName}`,
            marketName,
            outcomeId,
            outcomeName,
            odds,
            active,
            startTime: fixture.startTime,
            addedAt: Date.now(),
            betType: marketName,
            betTypeLine: null,
        });
    };

    const handleAddAllFromMarket = (
        outcomes: Array<{ id: string; name: string; odds: number; active: boolean }>,
        marketName: string,
    ) => {
        if (!fixture) return;
        let count = 0;
        for (const o of outcomes) {
            if (o.active && !slipIds.has(o.id)) {
                handleAddOutcome(o.id, o.name, o.odds, o.active, marketName);
                count++;
            }
        }
        if (count > 0) {
            addToast({ type: "success", title: `Added ${count} selection${count > 1 ? "s" : ""}` });
        }
    };

    const startTime = fixture?.startTime
        ? new Date(fixture.startTime).toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";

    return (
        <Modal open={open} onClose={onClose} title="" size="xl">
            {/* Header */}
            {fixture && (
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {fixture.isLive && (
                                <span className="flex items-center gap-1 text-[10px] font-mono text-bet-lost">
                                    <Radio size={10} className="animate-pulse" />
                                    LIVE
                                </span>
                            )}
                            <span className="text-xs font-mono text-muted-foreground">
                                {fixture.tournament.category.name} · {fixture.tournament.name}
                            </span>
                        </div>
                        <h3 className="text-sm font-mono font-semibold text-foreground">
                            {fixture.competitors[0]?.name}{" "}
                            <span className="text-muted-foreground">vs</span>{" "}
                            {fixture.competitors[1]?.name}
                        </h3>
                        {fixture.isLive && fixture.homeScore !== undefined && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-mono font-bold text-foreground tabular-nums">
                                    {fixture.homeScore} – {fixture.awayScore}
                                </span>
                            </div>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 block">{startTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
                        <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="border border-border rounded p-3 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-3/4" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="text-center py-8">
                    <p className="text-sm font-mono text-bet-lost">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => fixture?.id && fetchDetails(fixture.id)} className="mt-3">
                        Retry
                    </Button>
                </div>
            )}

            {/* Market Groups */}
            {!isLoading && !error && details && (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {details.marketGroups.length === 0 && (
                        <div className="text-center py-8 text-sm font-mono text-muted-foreground">
                            No markets available for this fixture
                        </div>
                    )}
                    {details.marketGroups.map((group) => {
                        const totalMarkets = group.templates.reduce((acc, t) => acc + t.markets.length, 0);
                        const isExpanded = expandedGroups.has(group.name);
                        return (
                            <div key={group.name} className="border border-border rounded overflow-hidden">
                                {/* Group header */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.name)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/50 hover:bg-secondary transition-colors text-left"
                                >
                                    {isExpanded ? (
                                        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                                    ) : (
                                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                                    )}
                                    <span className="text-xs font-mono font-medium text-foreground">{group.translation || group.name}</span>
                                    <Badge variant="neutral" size="sm">{totalMarkets}</Badge>
                                </button>

                                {/* Markets */}
                                {isExpanded && (
                                    <div className="p-3 space-y-3">
                                        {group.templates.map((template) =>
                                            template.markets.map((market) => (
                                                <div key={market.id} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-mono text-muted-foreground">{market.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={market.status === "active" ? "success" : market.status === "suspended" ? "warning" : "error"}
                                                                size="sm"
                                                            >
                                                                {market.status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleAddAllFromMarket(market.outcomes, market.name)}
                                                                disabled={!market.outcomes.some((o) => o.active)}
                                                            >
                                                                <Zap size={10} />
                                                                Add All
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {market.outcomes.map((outcome) => (
                                                            <OddsButton
                                                                key={outcome.id}
                                                                odds={outcome.odds}
                                                                name={outcome.name}
                                                                active={outcome.active}
                                                                suspended={market.status === "suspended" || !outcome.active}
                                                                selected={slipIds.has(outcome.id)}
                                                                onClick={() => handleAddOutcome(outcome.id, outcome.name, outcome.odds, outcome.active, market.name)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {details && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-[10px] font-mono text-muted-foreground">
                        {details.marketGroups.length} groups · {details.marketGroups.reduce((acc, g) => acc + g.templates.reduce((a, t) => a + t.markets.length, 0), 0)} markets
                    </span>
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>
            )}
        </Modal>
    );
}
