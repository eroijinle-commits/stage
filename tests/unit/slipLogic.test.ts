/**
 * Unit tests for bet slip logic — calculations and validation.
 * @module tests/unit/slipLogic
 */

import { describe, it, expect } from "vitest";
import {
    calculatePotentialReturn,
    calculateTotalStake,
    validateSlip,
    canPlaceBet,
} from "@/lib/state/slipLogic";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import { createMockSelection, createMockSelections } from "../fixtures/mock-stake-responses";

// ─── calculatePotentialReturn ───────────────────────────────────────────────

describe("calculatePotentialReturn", () => {
    describe("singles mode", () => {
        it("returns 0 for empty selections", () => {
            expect(calculatePotentialReturn([], "singles", 1000)).toBe(0);
        });

        it("calculates return for a single selection", () => {
            const selections = [createMockSelection({ odds: 2.0 })];
            expect(calculatePotentialReturn(selections, "singles", 1000)).toBe(2000);
        });

        it("sums returns for multiple selections", () => {
            const selections = [
                createMockSelection({ id: "s1", odds: 2.0 }),
                createMockSelection({ id: "s2", odds: 3.0 }),
            ];
            // 1000 * 2.0 + 1000 * 3.0 = 5000
            expect(calculatePotentialReturn(selections, "singles", 1000)).toBe(5000);
        });

        it("uses per-leg stakes when provided", () => {
            const selections = [
                createMockSelection({ id: "s1", odds: 2.0 }),
                createMockSelection({ id: "s2", odds: 3.0 }),
            ];
            const perLegStakes = { s1: 500, s2: 2000 };
            // 500 * 2.0 + 2000 * 3.0 = 7000
            expect(calculatePotentialReturn(selections, "singles", 1000, perLegStakes)).toBe(7000);
        });

        it("handles fractional odds correctly", () => {
            const selections = [createMockSelection({ odds: 1.75 })];
            expect(calculatePotentialReturn(selections, "singles", 1000)).toBe(1750);
        });
    });

    describe("parlay mode", () => {
        it("returns 0 for empty selections", () => {
            expect(calculatePotentialReturn([], "parlay", 1000)).toBe(0);
        });

        it("calculates combined odds for parlay", () => {
            const selections = [
                createMockSelection({ id: "s1", odds: 2.0 }),
                createMockSelection({ id: "s2", odds: 3.0 }),
            ];
            // 1000 * (2.0 * 3.0) = 6000
            expect(calculatePotentialReturn(selections, "parlay", 1000)).toBe(6000);
        });

        it("calculates parlay with 3+ legs", () => {
            const selections = [
                createMockSelection({ id: "s1", odds: 1.5 }),
                createMockSelection({ id: "s2", odds: 2.0 }),
                createMockSelection({ id: "s3", odds: 2.5 }),
            ];
            // 1000 * (1.5 * 2.0 * 2.5) = 7500
            expect(calculatePotentialReturn(selections, "parlay", 1000)).toBe(7500);
        });

        it("rounds result to 2 decimals", () => {
            const selections = [
                createMockSelection({ id: "s1", odds: 1.33 }),
                createMockSelection({ id: "s2", odds: 1.5 }),
            ];
            const result = calculatePotentialReturn(selections, "parlay", 1000);
            // 1000 * (1.33 * 1.5) = 1995
            expect(result).toBe(1995);
        });
    });
});

// ─── calculateTotalStake ────────────────────────────────────────────────────

describe("calculateTotalStake", () => {
    it("returns 0 for empty selections", () => {
        expect(calculateTotalStake([], "singles", 1000)).toBe(0);
    });

    it("sums stakes for singles", () => {
        const selections = createMockSelections(3);
        // 3 * 1000 = 3000
        expect(calculateTotalStake(selections, "singles", 1000)).toBe(3000);
    });

    it("returns single stake for parlay", () => {
        const selections = createMockSelections(3);
        expect(calculateTotalStake(selections, "parlay", 1000)).toBe(1000);
    });

    it("uses per-leg stakes when provided", () => {
        const selections = [
            createMockSelection({ id: "s1" }),
            createMockSelection({ id: "s2" }),
        ];
        const perLegStakes = { s1: 500, s2: 2000 };
        expect(calculateTotalStake(selections, "singles", 1000, perLegStakes)).toBe(2500);
    });
});

// ─── validateSlip ───────────────────────────────────────────────────────────

describe("validateSlip", () => {
    it("returns error for empty selections", () => {
        const errors = validateSlip([], 10000, 1000);
        expect(errors).toContain("No selections in the slip.");
    });

    it("returns error for zero stake", () => {
        const selections = createMockSelections(1);
        const errors = validateSlip(selections, 10000, 0);
        expect(errors).toContain("Total stake must be greater than zero.");
    });

    it("returns error for negative stake", () => {
        const selections = createMockSelections(1);
        const errors = validateSlip(selections, 10000, -100);
        expect(errors).toContain("Total stake must be greater than zero.");
    });

    it("returns error for insufficient balance", () => {
        const selections = createMockSelections(1);
        const errors = validateSlip(selections, 500, 1000);
        expect(errors.some((e) => e.includes("Insufficient balance"))).toBe(true);
    });

    it("allows null balance (unknown balance)", () => {
        const selections = createMockSelections(1);
        const errors = validateSlip(selections, null, 1000);
        expect(errors.some((e) => e.includes("Insufficient balance"))).toBe(false);
    });

    it("catches duplicate selections", () => {
        const selections = [
            createMockSelection({ id: "s1", outcomeId: "o1" }),
            createMockSelection({ id: "s2", outcomeId: "o1" }),
        ];
        const errors = validateSlip(selections, 10000, 2000);
        expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    it("catches suspended/inactive selections", () => {
        const selections = [
            createMockSelection({ id: "s1", active: true }),
            createMockSelection({ id: "s2", active: false }),
        ];
        const errors = validateSlip(selections, 10000, 2000);
        expect(errors.some((e) => e.includes("no longer available"))).toBe(true);
    });

    it("catches invalid odds (zero or negative)", () => {
        const selections = [
            createMockSelection({ id: "s1", odds: 0 }),
            createMockSelection({ id: "s2", odds: -1.5 }),
        ];
        const errors = validateSlip(selections, 10000, 2000);
        expect(errors.some((e) => e.includes("invalid odds"))).toBe(true);
    });

    it("returns empty array for valid slip", () => {
        const selections = createMockSelections(2);
        const errors = validateSlip(selections, 10000, 2000);
        expect(errors).toHaveLength(0);
    });

    it("validates exact balance match", () => {
        const selections = createMockSelections(1);
        const errors = validateSlip(selections, 1000, 1000);
        expect(errors).toHaveLength(0);
    });
});

// ─── canPlaceBet ────────────────────────────────────────────────────────────

describe("canPlaceBet", () => {
    it("returns true for valid slip", () => {
        const selections = createMockSelections(2);
        expect(canPlaceBet(selections, 10000, 2000)).toBe(true);
    });

    it("returns false for empty selections", () => {
        expect(canPlaceBet([], 10000, 1000)).toBe(false);
    });

    it("returns false for insufficient balance", () => {
        const selections = createMockSelections(1);
        expect(canPlaceBet(selections, 500, 1000)).toBe(false);
    });

    it("returns false for zero stake", () => {
        const selections = createMockSelections(1);
        expect(canPlaceBet(selections, 10000, 0)).toBe(false);
    });

    it("returns true with null balance", () => {
        const selections = createMockSelections(1);
        expect(canPlaceBet(selections, null, 1000)).toBe(true);
    });
});
