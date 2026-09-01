/**
 * Unit tests for compute slip isolation — store actions and per-slip placement.
 * Tests that compute slips are isolated entities with their own state,
 * and that manual selections and compute slips coexist without interference.
 *
 * In the new multi-slip architecture, compute slips are SlipData entries in the
 * `slips[]` array (non-active slips), and manual selections live in the active slip.
 * @module tests/unit/computeSlipIsolation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSlipStore, type SlipData } from "@/store/useSlipStore";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import { createMockSelection, createMockSelections } from "../fixtures/mock-stake-responses";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSlipData(overrides: Partial<SlipData> = {}): SlipData {
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

/** Reset store and return the default active slip ID. */
function resetStore(): string {
    const id = `test-active-${Date.now()}`;
    useSlipStore.setState({
        slips: [{
            id,
            name: "Manual Slip",
            selections: [],
            mode: "singles",
            stakePerLeg: 1000,
            stakeShieldEnabled: false,
            isPlacing: false,
            placeResults: [],
            lastError: null,
            createdAt: Date.now(),
        }],
        activeSlipId: id,
    });
    return id;
}

/** Create a new slip and populate it (simulates addComputeSlip). Returns slip ID. */
function addComputeSlip(entry: SlipData): string {
    const { slips } = useSlipStore.getState();
    // Deduplicate: if a slip with this ID already exists, skip creating a new one
    if (slips.some((s) => s.id === entry.id)) {
        return entry.id;
    }
    const prevActive = useSlipStore.getState().activeSlipId;
    const generatedId = useSlipStore.getState().createSlip(entry.name);
    useSlipStore.setState((st) => ({
        slips: st.slips.map((s) =>
            s.id === generatedId
                ? { ...s, ...entry } // entry.id overrides the generated id
                : s,
        ),
        activeSlipId: prevActive, // restore original active slip
    }));
    return entry.id;
}

/** Create multiple new slips and populate them (simulates addComputeSlips). */
function addComputeSlips(entries: SlipData[]): string[] {
    return entries.map((e) => addComputeSlip(e));
}

/** Get all non-active slips (compute slips in the new architecture). */
function getComputeSlips(): SlipData[] {
    const { slips, activeSlipId } = useSlipStore.getState();
    return slips.filter((s) => s.id !== activeSlipId);
}

/** Patch fields on a specific slip (simulates updateComputeSlip). */
function updateComputeSlip(id: string, patch: Partial<Pick<SlipData, "mode" | "stakePerLeg" | "stakeShieldEnabled">>) {
    useSlipStore.setState((st) => ({
        slips: st.slips.map((s) =>
            s.id === id ? { ...s, ...patch } : s,
        ),
    }));
}

/** Set placing flag on a specific slip. */
function setComputeSlipPlacing(id: string, v: boolean) {
    useSlipStore.setState((st) => ({
        slips: st.slips.map((s) =>
            s.id === id ? { ...s, isPlacing: v } : s,
        ),
    }));
}

/** Set placement results on a specific slip. */
function setComputeSlipResults(id: string, results: SlipData["placeResults"]) {
    useSlipStore.setState((st) => ({
        slips: st.slips.map((s) =>
            s.id === id ? { ...s, placeResults: results } : s,
        ),
    }));
}

/** Set error on a specific slip. */
function setComputeSlipError(id: string, error: string | null) {
    useSlipStore.setState((st) => ({
        slips: st.slips.map((s) =>
            s.id === id ? { ...s, lastError: error } : s,
        ),
    }));
}

// ─── Reset store between tests ─────────────────────────────────────────────

let activeSlipId: string;

beforeEach(() => {
    activeSlipId = resetStore();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Store actions — compute slip CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Store Actions", () => {
    describe("addComputeSlip", () => {
        it("adds a single compute slip entry", () => {
            const entry = makeSlipData({ id: "cs-1" });
            addComputeSlip(entry);

            expect(getComputeSlips()).toHaveLength(1);
            expect(getComputeSlips()[0].id).toBe("cs-1");
        });

        it("deduplicates by id", () => {
            const entry = makeSlipData({ id: "cs-1" });
            addComputeSlip(entry);
            addComputeSlip(entry);

            // Second add overwrites, so still 1 compute slip
            expect(getComputeSlips()).toHaveLength(1);
        });

        it("allows multiple distinct entries", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            addComputeSlip(makeSlipData({ id: "cs-2" }));
            addComputeSlip(makeSlipData({ id: "cs-3" }));

            expect(getComputeSlips()).toHaveLength(3);
        });
    });

    describe("addComputeSlips", () => {
        it("adds multiple entries at once", () => {
            const entries = [
                makeSlipData({ id: "cs-1" }),
                makeSlipData({ id: "cs-2" }),
                makeSlipData({ id: "cs-3" }),
            ];
            addComputeSlips(entries);

            expect(getComputeSlips()).toHaveLength(3);
        });

        it("deduplicates batch against existing entries", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));

            const batch = [
                makeSlipData({ id: "cs-1" }), // dup — overwrites
                makeSlipData({ id: "cs-2" }), // new
            ];
            addComputeSlips(batch);

            expect(getComputeSlips()).toHaveLength(2);
        });

        it("no-op for empty array", () => {
            addComputeSlips([]);
            expect(getComputeSlips()).toHaveLength(0);
        });
    });

    describe("removeComputeSlip", () => {
        it("removes an entry by id", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            addComputeSlip(makeSlipData({ id: "cs-2" }));

            useSlipStore.getState().deleteSlip("cs-1");

            expect(getComputeSlips()).toHaveLength(1);
            expect(getComputeSlips()[0].id).toBe("cs-2");
        });

        it("no-op for non-existent id", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            useSlipStore.getState().deleteSlip("nonexistent");

            expect(getComputeSlips()).toHaveLength(1);
        });
    });

    describe("clearComputeSlips", () => {
        it("removes all compute slip entries", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            addComputeSlip(makeSlipData({ id: "cs-2" }));

            // Clear each compute slip
            getComputeSlips().forEach((s) => useSlipStore.getState().clearSlip(s.id));
            // Then delete them
            getComputeSlips().forEach((s) => useSlipStore.getState().deleteSlip(s.id));

            expect(getComputeSlips()).toHaveLength(0);
        });
    });

    describe("updateComputeSlip", () => {
        it("patches fields on a specific entry", () => {
            addComputeSlip(makeSlipData({
                id: "cs-1",
                mode: "singles",
                stakePerLeg: 1000,
            }));

            updateComputeSlip("cs-1", {
                mode: "parlay",
                stakePerLeg: 5000,
            });

            const entry = getComputeSlips().find((e) => e.id === "cs-1")!;
            expect(entry.mode).toBe("parlay");
            expect(entry.stakePerLeg).toBe(5000);
        });

        it("no-op for non-existent id", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            updateComputeSlip("nonexistent", { mode: "parlay" });

            expect(getComputeSlips()[0].mode).toBe("singles");
        });
    });

    describe("transient state setters", () => {
        it("setComputeSlipPlacing toggles placing flag", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));

            setComputeSlipPlacing("cs-1", true);
            expect(getComputeSlips()[0].isPlacing).toBe(true);

            setComputeSlipPlacing("cs-1", false);
            expect(getComputeSlips()[0].isPlacing).toBe(false);
        });

        it("setComputeSlipResults stores placement results", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));
            const results = [{ selectionId: "s1", success: true, placedAt: Date.now() }];

            setComputeSlipResults("cs-1", results);
            expect(getComputeSlips()[0].placeResults).toEqual(results);
        });

        it("setComputeSlipError stores error message", () => {
            addComputeSlip(makeSlipData({ id: "cs-1" }));

            setComputeSlipError("cs-1", "Insufficient balance");
            expect(getComputeSlips()[0].lastError).toBe("Insufficient balance");

            setComputeSlipError("cs-1", null);
            expect(getComputeSlips()[0].lastError).toBeNull();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Isolation: compute slips vs manual selections
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Manual + Compute Coexistence", () => {
    it("manual selections and compute slips live in separate slips", () => {
        // Add manual selections to active slip
        const manualSelections = createMockSelections(3);
        manualSelections.forEach((s) => useSlipStore.getState().addSelection(s));

        // Add compute slips (non-active slips)
        const cs1 = makeSlipData({ id: "cs-1", selections: createMockSelections(2) });
        const cs2 = makeSlipData({ id: "cs-2", selections: createMockSelections(4) });
        addComputeSlips([cs1, cs2]);

        // Manual selections are in the active slip
        const activeSlip = useSlipStore.getState().slips.find((s) => s.id === activeSlipId)!;
        expect(activeSlip.selections).toHaveLength(3);

        // Compute slips are separate
        const computeSlips = getComputeSlips();
        expect(computeSlips).toHaveLength(2);
        expect(computeSlips[0].selections).toHaveLength(2);
        expect(computeSlips[1].selections).toHaveLength(4);
    });

    it("clearing compute slips does not affect manual selections", () => {
        useSlipStore.getState().addSelection(createMockSelection({ id: "m1", outcomeId: "mo1" }));
        useSlipStore.getState().addSelection(createMockSelection({ id: "m2", outcomeId: "mo2" }));

        addComputeSlip(makeSlipData({ id: "cs-1", selections: createMockSelections(3) }));
        addComputeSlip(makeSlipData({ id: "cs-2", selections: createMockSelections(2) }));

        // Remove compute slips
        useSlipStore.getState().deleteSlip("cs-1");
        useSlipStore.getState().deleteSlip("cs-2");

        const activeSlip = useSlipStore.getState().slips.find((s) => s.id === activeSlipId)!;
        expect(activeSlip.selections).toHaveLength(2);
        expect(getComputeSlips()).toHaveLength(0);
    });

    it("clearing manual selections does not affect compute slips", () => {
        useSlipStore.getState().addSelection(createMockSelection({ id: "m1", outcomeId: "mo1" }));

        addComputeSlip(makeSlipData({ id: "cs-1", selections: createMockSelections(2) }));

        // Clear manual selections
        useSlipStore.getState().clearSelections();

        const activeSlip = useSlipStore.getState().slips.find((s) => s.id === activeSlipId)!;
        expect(activeSlip.selections).toHaveLength(0);
        expect(getComputeSlips()).toHaveLength(1);
        expect(getComputeSlips()[0].selections).toHaveLength(2);
    });

    it("each compute slip has independent mode and stake", () => {
        addComputeSlip(makeSlipData({ id: "cs-1", mode: "singles", stakePerLeg: 1000 }));
        addComputeSlip(makeSlipData({ id: "cs-2", mode: "parlay", stakePerLeg: 5000 }));

        updateComputeSlip("cs-1", { stakePerLeg: 2000 });

        const cs1 = getComputeSlips().find((s) => s.id === "cs-1")!;
        const cs2 = getComputeSlips().find((s) => s.id === "cs-2")!;
        expect(cs1.stakePerLeg).toBe(2000);
        expect(cs2.stakePerLeg).toBe(5000);
    });

    it("manual mode changes do not affect compute slips", () => {
        addComputeSlip(makeSlipData({ id: "cs-1", mode: "singles" }));

        useSlipStore.getState().setMode("parlay");

        const activeSlip = useSlipStore.getState().slips.find((s) => s.id === activeSlipId)!;
        expect(activeSlip.mode).toBe("parlay");
        expect(getComputeSlips()[0].mode).toBe("singles");
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Per-slip placement state
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Slip Isolation — Per-Slip Placement", () => {
    it("placing one compute slip does not affect others", () => {
        addComputeSlip(makeSlipData({ id: "cs-1" }));
        addComputeSlip(makeSlipData({ id: "cs-2" }));

        setComputeSlipPlacing("cs-1", true);

        expect(getComputeSlips().find((s) => s.id === "cs-1")!.isPlacing).toBe(true);
        expect(getComputeSlips().find((s) => s.id === "cs-2")!.isPlacing).toBe(false);
    });

    it("placement results are per-slip", () => {
        addComputeSlip(makeSlipData({ id: "cs-1" }));
        addComputeSlip(makeSlipData({ id: "cs-2" }));

        const results1 = [{ selectionId: "s1", success: true, placedAt: Date.now() }];
        const results2 = [{ selectionId: "s2", success: false, placedAt: Date.now() }];

        setComputeSlipResults("cs-1", results1);
        setComputeSlipResults("cs-2", results2);

        expect(getComputeSlips().find((s) => s.id === "cs-1")!.placeResults).toEqual(results1);
        expect(getComputeSlips().find((s) => s.id === "cs-2")!.placeResults).toEqual(results2);
    });

    it("errors are per-slip", () => {
        addComputeSlip(makeSlipData({ id: "cs-1" }));
        addComputeSlip(makeSlipData({ id: "cs-2" }));

        setComputeSlipError("cs-1", "Insufficient balance");

        expect(getComputeSlips().find((s) => s.id === "cs-1")!.lastError).toBe("Insufficient balance");
        expect(getComputeSlips().find((s) => s.id === "cs-2")!.lastError).toBeNull();
    });

    it("manual placement state is independent of compute slips", () => {
        addComputeSlip(makeSlipData({ id: "cs-1" }));

        useSlipStore.getState().setPlacing(true);

        const activeSlip = useSlipStore.getState().slips.find((s) => s.id === activeSlipId)!;
        expect(activeSlip.isPlacing).toBe(true);
        expect(getComputeSlips()[0].isPlacing).toBe(false);
    });
});
