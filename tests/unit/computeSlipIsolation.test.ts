/**
 * Unit tests for compute slip isolation — store actions and per-slip placement.
 * Tests that compute slips are isolated entities with their own state,
 * and that manual selections and compute slips coexist without interference.
 * @module tests/unit/computeSlipIsolation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSlipStore } from "@/store/useSlipStore";
import type { ComputeSlipEntry } from "@/store/useSlipStore";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import { createMockSelection, createMockSelections } from "../fixtures/mock-stake-responses";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeComputeEntry(overrides: Partial<ComputeSlipEntry> = {}): ComputeSlipEntry {
    return {
        id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "Test Slip",
        selections: createMockSelections(2),
        mode: "singles",
        stakePerLeg: 1000,
        stakeShieldEnabled: false,
        isPlacing: false,
        placeResults: [],
        lastError: null,
        createdAt: Date.now(),
        ...overrides,
    };
}

// ─── Reset store between tests ─────────────────────────────────────────────

beforeEach(() => {
    useSlipStore.setState({
        selections: [],
        computeSlips: [],
        mode: "singles",
        stakePerLeg: 1000,
        stakeShieldEnabled: false,
        placeResults: [],
        lastError: null,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Store actions — compute slip CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Store Actions", () => {
    describe("addComputeSlip", () => {
        it("adds a single compute slip entry", () => {
            const entry = makeComputeEntry({ id: "cs-1" });
            useSlipStore.getState().addComputeSlip(entry);

            expect(useSlipStore.getState().computeSlips).toHaveLength(1);
            expect(useSlipStore.getState().computeSlips[0].id).toBe("cs-1");
        });

        it("deduplicates by id", () => {
            const entry = makeComputeEntry({ id: "cs-1" });
            useSlipStore.getState().addComputeSlip(entry);
            useSlipStore.getState().addComputeSlip(entry);

            expect(useSlipStore.getState().computeSlips).toHaveLength(1);
        });

        it("allows multiple distinct entries", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-2" }));
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-3" }));

            expect(useSlipStore.getState().computeSlips).toHaveLength(3);
        });
    });

    describe("addComputeSlips", () => {
        it("adds multiple entries at once", () => {
            const entries = [
                makeComputeEntry({ id: "cs-1" }),
                makeComputeEntry({ id: "cs-2" }),
                makeComputeEntry({ id: "cs-3" }),
            ];
            useSlipStore.getState().addComputeSlips(entries);

            expect(useSlipStore.getState().computeSlips).toHaveLength(3);
        });

        it("deduplicates batch against existing entries", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));

            const batch = [
                makeComputeEntry({ id: "cs-1" }), // dup
                makeComputeEntry({ id: "cs-2" }), // new
            ];
            useSlipStore.getState().addComputeSlips(batch);

            expect(useSlipStore.getState().computeSlips).toHaveLength(2);
        });

        it("no-op for empty array", () => {
            useSlipStore.getState().addComputeSlips([]);
            expect(useSlipStore.getState().computeSlips).toHaveLength(0);
        });
    });

    describe("removeComputeSlip", () => {
        it("removes an entry by id", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-2" }));

            useSlipStore.getState().removeComputeSlip("cs-1");

            expect(useSlipStore.getState().computeSlips).toHaveLength(1);
            expect(useSlipStore.getState().computeSlips[0].id).toBe("cs-2");
        });

        it("no-op for non-existent id", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            useSlipStore.getState().removeComputeSlip("nonexistent");

            expect(useSlipStore.getState().computeSlips).toHaveLength(1);
        });
    });

    describe("clearComputeSlips", () => {
        it("removes all compute slip entries", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-2" }));

            useSlipStore.getState().clearComputeSlips();

            expect(useSlipStore.getState().computeSlips).toHaveLength(0);
        });
    });

    describe("updateComputeSlip", () => {
        it("patches fields on a specific entry", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({
                id: "cs-1",
                mode: "singles",
                stakePerLeg: 1000,
            }));

            useSlipStore.getState().updateComputeSlip("cs-1", {
                mode: "parlay",
                stakePerLeg: 5000,
            });

            const entry = useSlipStore.getState().computeSlips.find((e) => e.id === "cs-1")!;
            expect(entry.mode).toBe("parlay");
            expect(entry.stakePerLeg).toBe(5000);
        });

        it("no-op for non-existent id", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            useSlipStore.getState().updateComputeSlip("nonexistent", { mode: "parlay" });

            expect(useSlipStore.getState().computeSlips[0].mode).toBe("singles");
        });
    });

    describe("transient state setters", () => {
        it("setComputeSlipPlacing toggles placing flag", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));

            useSlipStore.getState().setComputeSlipPlacing("cs-1", true);
            expect(useSlipStore.getState().computeSlips[0].isPlacing).toBe(true);

            useSlipStore.getState().setComputeSlipPlacing("cs-1", false);
            expect(useSlipStore.getState().computeSlips[0].isPlacing).toBe(false);
        });

        it("setComputeSlipResults stores placement results", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));
            const results = [{ selectionId: "s1", success: true, placedAt: Date.now() }];

            useSlipStore.getState().setComputeSlipResults("cs-1", results);
            expect(useSlipStore.getState().computeSlips[0].placeResults).toEqual(results);
        });

        it("setComputeSlipError stores error message", () => {
            useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));

            useSlipStore.getState().setComputeSlipError("cs-1", "Insufficient balance");
            expect(useSlipStore.getState().computeSlips[0].lastError).toBe("Insufficient balance");

            useSlipStore.getState().setComputeSlipError("cs-1", null);
            expect(useSlipStore.getState().computeSlips[0].lastError).toBeNull();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Isolation: compute slips vs manual selections
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Manual + Compute Coexistence", () => {
    it("manual selections and compute slips live in separate arrays", () => {
        // Add manual selections
        useSlipStore.getState().addSelection(createMockSelection({ id: "manual-1" }));
        useSlipStore.getState().addSelection(createMockSelection({ id: "manual-2" }));

        // Add compute slips
        useSlipStore.getState().addComputeSlip(makeComputeEntry({
            id: "cs-1",
            selections: createMockSelections(3),
        }));

        expect(useSlipStore.getState().selections).toHaveLength(2);
        expect(useSlipStore.getState().computeSlips).toHaveLength(1);
        expect(useSlipStore.getState().computeSlips[0].selections).toHaveLength(3);
    });

    it("clearSelections does not affect compute slips", () => {
        useSlipStore.getState().addSelection(createMockSelection({ id: "manual-1" }));
        useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));

        useSlipStore.getState().clearSelections();

        expect(useSlipStore.getState().selections).toHaveLength(0);
        expect(useSlipStore.getState().computeSlips).toHaveLength(1);
    });

    it("clearComputeSlips does not affect manual selections", () => {
        useSlipStore.getState().addSelection(createMockSelection({ id: "manual-1" }));
        useSlipStore.getState().addComputeSlip(makeComputeEntry({ id: "cs-1" }));

        useSlipStore.getState().clearComputeSlips();

        expect(useSlipStore.getState().selections).toHaveLength(1);
        expect(useSlipStore.getState().computeSlips).toHaveLength(0);
    });

    it("each compute entry has isolated mode, stake, and results", () => {
        useSlipStore.getState().addComputeSlip(makeComputeEntry({
            id: "cs-1",
            mode: "singles",
            stakePerLeg: 1000,
        }));
        useSlipStore.getState().addComputeSlip(makeComputeEntry({
            id: "cs-2",
            mode: "parlay",
            stakePerLeg: 5000,
        }));

        // Update cs-1 only
        useSlipStore.getState().updateComputeSlip("cs-1", { stakePerLeg: 2000 });

        const entry1 = useSlipStore.getState().computeSlips.find((e) => e.id === "cs-1")!;
        const entry2 = useSlipStore.getState().computeSlips.find((e) => e.id === "cs-2")!;

        expect(entry1.stakePerLeg).toBe(2000);
        expect(entry2.stakePerLeg).toBe(5000); // unchanged
        expect(entry1.mode).toBe("singles");
        expect(entry2.mode).toBe("parlay");
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Partialize: persistence resets transient state
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Persistence", () => {
    it("partialize resets transient fields on compute slips", () => {
        useSlipStore.getState().addComputeSlip(makeComputeEntry({
            id: "cs-1",
            isPlacing: true,
            placeResults: [{ selectionId: "x", success: true, placedAt: 123 }],
            lastError: "some error",
        }));

        // partialize is internal to persist middleware — access via cast
        const store = useSlipStore as any;
        const persisted = store.persist.getOptions().partialize(useSlipStore.getState());

        const cs = persisted.computeSlips.find((e: any) => e.id === "cs-1")!;
        expect(cs.isPlacing).toBe(false);
        expect(cs.placeResults).toHaveLength(0);
        expect(cs.lastError).toBeNull();
        // Stable fields preserved
        expect(cs.id).toBe("cs-1");
        expect(cs.selections).toHaveLength(2);
    });
});
