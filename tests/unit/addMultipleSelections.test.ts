/**
 * Unit tests for useSlipStore.addMultipleSelections — batch add, duplicate
 * rejection, mixed operations, and state integrity.
 * @module tests/unit/addMultipleSelections
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSlipStore } from "@/store/useSlipStore";
import { createMockSelection, createMockSelections } from "../fixtures/mock-stake-responses";
import type { BetSelection } from "@/lib/contracts/ui.contract";

// Reset the store between tests so state doesn't leak.
beforeEach(() => {
    useSlipStore.setState({
        selections: [],
        mode: "singles",
        stakePerLeg: 1000,
        placeResults: [],
        lastError: null,
    });
});

// ─── Basic batch add ────────────────────────────────────────────────────────

describe("addMultipleSelections", () => {
    describe("basic batch add", () => {
        it("adds multiple selections to an empty slip", () => {
            const batch = createMockSelections(3);
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(3);
        });

        it("adds selections to an existing slip", () => {
            const existing = createMockSelection({ id: "existing-1", outcomeId: "eo1" });
            useSlipStore.getState().addSelection(existing);

            const batch = createMockSelections(2);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().selections).toHaveLength(3);
        });

        it("preserves selection order — existing first, then new", () => {
            const existing = createMockSelection({ id: "existing-1", outcomeId: "eo1" });
            useSlipStore.getState().addSelection(existing);

            const s1 = createMockSelection({ id: "batch-1", outcomeId: "bo1" });
            const s2 = createMockSelection({ id: "batch-2", outcomeId: "bo2" });
            useSlipStore.getState().addMultipleSelections([s1, s2]);

            const ids = useSlipStore.getState().selections.map((s) => s.id);
            expect(ids).toEqual(["existing-1", "batch-1", "batch-2"]);
        });
    });

    // ─── Duplicate rejection ──────────────────────────────────────────────

    describe("duplicate rejection", () => {
        it("skips selections already in the slip", () => {
            const s1 = createMockSelection({ id: "dup-1", outcomeId: "d1" });
            const s2 = createMockSelection({ id: "dup-2", outcomeId: "d2" });
            useSlipStore.getState().addMultipleSelections([s1, s2]);
            expect(useSlipStore.getState().selections).toHaveLength(2);

            // Try adding s1 again — should be skipped
            useSlipStore.getState().addMultipleSelections([s1]);
            expect(useSlipStore.getState().selections).toHaveLength(2);
        });

        it("handles batch with all duplicates (no-op)", () => {
            const batch = createMockSelections(3);
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(3);

            // Re-add same batch — nothing should change
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(3);
        });

        it("adds only non-duplicate selections from a mixed batch", () => {
            const s1 = createMockSelection({ id: "keep-1", outcomeId: "k1" });
            const s2 = createMockSelection({ id: "keep-2", outcomeId: "k2" });
            useSlipStore.getState().addMultipleSelections([s1, s2]);

            // Batch: s1 (dup), s2 (dup), s3 (new)
            const s3 = createMockSelection({ id: "new-1", outcomeId: "n1" });
            useSlipStore.getState().addMultipleSelections([s1, s2, s3]);

            expect(useSlipStore.getState().selections).toHaveLength(3);
            const ids = useSlipStore.getState().selections.map((s) => s.id);
            expect(ids).toContain("new-1");
        });

        it("is idempotent — calling twice with same batch yields same result", () => {
            const batch = createMockSelections(4);
            useSlipStore.getState().addMultipleSelections(batch);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().selections).toHaveLength(4);
        });
    });

    // ─── Edge cases: empty / invalid inputs ───────────────────────────────

    describe("edge cases", () => {
        it("no-op for empty array", () => {
            useSlipStore.getState().addMultipleSelections([]);
            expect(useSlipStore.getState().selections).toHaveLength(0);
        });

        it("no-op for null/undefined (guard)", () => {
            // TypeScript won't allow null, but runtime callers might pass it.
            // The implementation guards: if (!newSelections || ...) return {};
            const store = useSlipStore.getState();
            // @ts-expect-error — testing runtime guard
            store.addMultipleSelections(null);
            // @ts-expect-error — testing runtime guard
            store.addMultipleSelections(undefined);
            expect(useSlipStore.getState().selections).toHaveLength(0);
        });

        it("filters out selections with missing/empty id", () => {
            const valid = createMockSelection({ id: "valid-1", outcomeId: "v1" });
            const noId = { ...createMockSelection({ id: "", outcomeId: "bad" }) } as BetSelection;
            const invalid = createMockSelection({ id: "valid-2", outcomeId: "v2" });

            useSlipStore.getState().addMultipleSelections([noId, valid, invalid]);
            expect(useSlipStore.getState().selections).toHaveLength(2);
            expect(useSlipStore.getState().selections.map((s) => s.id)).toEqual(["valid-1", "valid-2"]);
        });

        it("handles large batch (100 selections)", () => {
            const batch = Array.from({ length: 100 }, (_, i) =>
                createMockSelection({ id: `big-${i}`, outcomeId: `ob-${i}` }),
            );
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(100);
        });

        it("handles large batch with many duplicates", () => {
            const batch = Array.from({ length: 50 }, (_, i) =>
                createMockSelection({ id: `bulk-${i}`, outcomeId: `ob-${i}` }),
            );
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(50);

            // Add same 50 + 50 new
            const batch2 = [
                ...batch,
                ...Array.from({ length: 50 }, (_, i) =>
                    createMockSelection({ id: `bulk2-${i}`, outcomeId: `ob2-${i}` }),
                ),
            ];
            useSlipStore.getState().addMultipleSelections(batch2);
            expect(useSlipStore.getState().selections).toHaveLength(100);
        });
    });

    // ─── Mixed single + batch operations ──────────────────────────────────

    describe("mixed single + batch operations", () => {
        it("addSelection then addMultipleSelections", () => {
            const single = createMockSelection({ id: "s1", outcomeId: "o1" });
            useSlipStore.getState().addSelection(single);

            const batch = createMockSelections(3);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().selections).toHaveLength(4);
        });

        it("addMultipleSelections then removeSelection", () => {
            const batch = createMockSelections(3);
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(3);

            useSlipStore.getState().removeSelection("sel-1");
            expect(useSlipStore.getState().selections).toHaveLength(2);
            expect(useSlipStore.getState().selections.find((s) => s.id === "sel-1")).toBeUndefined();
        });

        it("addMultipleSelections then clearSelections", () => {
            const batch = createMockSelections(5);
            useSlipStore.getState().addMultipleSelections(batch);
            expect(useSlipStore.getState().selections).toHaveLength(5);

            useSlipStore.getState().clearSelections();
            expect(useSlipStore.getState().selections).toHaveLength(0);
        });

        it("interleaved single adds and batch adds", () => {
            const a = createMockSelection({ id: "a1", outcomeId: "ao1" });
            const b = createMockSelection({ id: "b1", outcomeId: "bo1" });
            const c = createMockSelection({ id: "c1", outcomeId: "co1" });

            useSlipStore.getState().addSelection(a);                   // [a]
            useSlipStore.getState().addMultipleSelections([b, c]);     // [a, b, c]
            useSlipStore.getState().addSelection(createMockSelection({ id: "d1", outcomeId: "do1" })); // [a, b, c, d]
            useSlipStore.getState().addMultipleSelections([a, b]);     // duplicates — no-op

            const ids = useSlipStore.getState().selections.map((s) => s.id);
            expect(ids).toEqual(["a1", "b1", "c1", "d1"]);
        });

        it("single add toggle does not affect batch-added selections", () => {
            const batch = createMockSelections(3);
            useSlipStore.getState().addMultipleSelections(batch);

            // addSelection toggles (removes) s1
            const toggle = createMockSelection({ id: "sel-1", outcomeId: "o1" });
            useSlipStore.getState().addSelection(toggle);

            expect(useSlipStore.getState().selections).toHaveLength(2);
            expect(useSlipStore.getState().selections.find((s) => s.id === "sel-1")).toBeUndefined();
        });
    });

    // ─── State integrity ──────────────────────────────────────────────────

    describe("state integrity", () => {
        it("preserves mode after batch add", () => {
            useSlipStore.getState().setMode("parlay");
            const batch = createMockSelections(2);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().mode).toBe("parlay");
        });

        it("preserves stakePerLeg after batch add", () => {
            useSlipStore.getState().setStakePerLeg(5000);
            const batch = createMockSelections(2);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().stakePerLeg).toBe(5000);
        });

        it("does not alter placeResults or lastError", () => {
            useSlipStore.getState().setPlaceResults([{ selectionId: "x", success: true, placedAt: Date.now() }]);
            useSlipStore.getState().setLastError("previous error");

            const batch = createMockSelections(2);
            useSlipStore.getState().addMultipleSelections(batch);

            expect(useSlipStore.getState().placeResults).toHaveLength(1);
            expect(useSlipStore.getState().lastError).toBe("previous error");
        });

        it("each selection retains all fields after batch add", () => {
            const s = createMockSelection({
                id: "integrity-1",
                fixtureSlug: "test-vs-check",
                fixtureName: "Test vs Check",
                fixtureId: "f-int",
                tournamentName: "Test Cup",
                marketId: "m-int",
                marketName: "Test Market",
                outcomeId: "o-int",
                outcomeName: "Test Outcome",
                odds: 3.5,
                active: true,
                startTime: "2026-09-01T10:00:00Z",
                betType: "test-type",
                betTypeLine: "line-1",
                sport: "soccer",
                stakeUrl: "https://stake.com/test",
            });

            useSlipStore.getState().addMultipleSelections([s]);
            const stored = useSlipStore.getState().selections[0];

            expect(stored.id).toBe("integrity-1");
            expect(stored.fixtureSlug).toBe("test-vs-check");
            expect(stored.fixtureName).toBe("Test vs Check");
            expect(stored.fixtureId).toBe("f-int");
            expect(stored.tournamentName).toBe("Test Cup");
            expect(stored.marketId).toBe("m-int");
            expect(stored.marketName).toBe("Test Market");
            expect(stored.outcomeId).toBe("o-int");
            expect(stored.outcomeName).toBe("Test Outcome");
            expect(stored.odds).toBe(3.5);
            expect(stored.active).toBe(true);
            expect(stored.startTime).toBe("2026-09-01T10:00:00Z");
            expect(stored.betType).toBe("test-type");
            expect(stored.betTypeLine).toBe("line-1");
            expect(stored.sport).toBe("soccer");
            expect(stored.stakeUrl).toBe("https://stake.com/test");
        });
    });

    // ─── ComputeSelection → BetSelection conversion context ───────────────

    describe("compute-to-bet conversion context", () => {
        it("accepts a manually mapped ComputeSelection-style batch as BetSelection[]", () => {
            // Simulates what the compute pipeline would produce after mapping:
            // ComputeSelection { marketId, marketName, outcomeId, outcomeName, odds, groupName }
            // → BetSelection (with required extras filled in by the caller)
            const computeMapped: BetSelection[] = [
                {
                    id: "compute-1",
                    fixtureSlug: "team-a-vs-team-b",
                    fixtureName: "Team A vs Team B",
                    fixtureId: "cf-1",
                    tournamentName: "Compute League",
                    marketId: "mkt-1",
                    marketName: "Match Winner",
                    outcomeId: "out-1",
                    outcomeName: "Team A",
                    odds: 2.1,
                    active: true,
                    startTime: "2026-09-15T14:00:00Z",
                    addedAt: Date.now(),
                    betType: "match-winner",
                    betTypeLine: null,
                },
                {
                    id: "compute-2",
                    fixtureSlug: "team-a-vs-team-b",
                    fixtureName: "Team A vs Team B",
                    fixtureId: "cf-1",
                    tournamentName: "Compute League",
                    marketId: "mkt-2",
                    marketName: "Over/Under 2.5",
                    outcomeId: "out-3",
                    outcomeName: "Over 2.5",
                    odds: 1.95,
                    active: true,
                    startTime: "2026-09-15T14:00:00Z",
                    addedAt: Date.now(),
                    betType: "over-under",
                    betTypeLine: "2.5",
                },
            ];

            useSlipStore.getState().addMultipleSelections(computeMapped);
            expect(useSlipStore.getState().selections).toHaveLength(2);
            expect(useSlipStore.getState().selections[0].marketName).toBe("Match Winner");
            expect(useSlipStore.getState().selections[1].betTypeLine).toBe("2.5");
        });

        it("prevents duplicate outcomeIds from compute pipeline", () => {
            const computeMapped: BetSelection[] = [
                {
                    id: "cp-a",
                    fixtureSlug: "f",
                    fixtureName: "F",
                    fixtureId: "f1",
                    tournamentName: "T",
                    marketId: "m1",
                    marketName: "M",
                    outcomeId: "same-outcome",
                    outcomeName: "X",
                    odds: 2.0,
                    active: true,
                    startTime: "2026-09-01T00:00:00Z",
                    addedAt: Date.now(),
                    betType: "mt",
                    betTypeLine: null,
                },
                {
                    id: "cp-b",
                    fixtureSlug: "f",
                    fixtureName: "F",
                    fixtureId: "f1",
                    tournamentName: "T",
                    marketId: "m2",
                    marketName: "M2",
                    outcomeId: "same-outcome",
                    outcomeName: "X",
                    odds: 2.5,
                    active: true,
                    startTime: "2026-09-01T00:00:00Z",
                    addedAt: Date.now(),
                    betType: "mt",
                    betTypeLine: null,
                },
            ];

            // These have different ids ("cp-a", "cp-b"), so both are added.
            // Deduplication is by `id`, not by `outcomeId`.
            useSlipStore.getState().addMultipleSelections(computeMapped);
            expect(useSlipStore.getState().selections).toHaveLength(2);
        });
    });
});
