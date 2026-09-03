/**
 * Integration tests for bet placement flow:
 * add selections → place → verify results.
 *
 * Note: We mock placeBetMutation and DB repositories at the module level
 * so that executeBetPlacement never hits the network or DB.
 * @module tests/integration/bet-placement-flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimiter } from "@/lib/stake-api/rate-limiter";
import {
  calculatePotentialReturn,
  calculateTotalStake,
  validateSlip,
  canPlaceBet,
} from "@/lib/state/slipLogic";
import { executeBetPlacement } from "@/lib/state/betPlacement";
import {
  createMockSelection,
  createMockSelections,
  mockPlaceBetResponse,
  mockPlaceBetErrorResponse,
} from "../fixtures/mock-stake-responses";
import { placeBetMutation } from "@/lib/stake-api/mutations";

// ── Module-level mocks ──────────────────────────────────────────────────────
// Mock the Stake API mutation so tests don't hit fetch
vi.mock("@/lib/stake-api/mutations", () => ({
  placeBetMutation: vi.fn(),
}));

// Mock DB repositories so persistBetToDb is a no-op
vi.mock("@/lib/db/repositories/bet.repository", () => ({
  createBet: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db/repositories/outcome.repository", () => ({
  createOutcome: vi.fn().mockResolvedValue({}),
}));

describe("Bet Placement Flow Integration", () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.restoreAllMocks();
    vi.mocked(placeBetMutation).mockReset();
  });

  describe("Single bet placement", () => {
    it("validates and places a single bet successfully", async () => {
      const selection = createMockSelection({
        odds: 1.85,
        active: true,
      });

      // Validate before placing
      const errors = validateSlip([selection], 50000, 1000);
      expect(errors).toHaveLength(0);
      expect(canPlaceBet([selection], 50000, 1000)).toBe(true);

      // Mock the API
      vi.mocked(placeBetMutation).mockResolvedValue(mockPlaceBetResponse.data.placeBet);

      // Place the bet
      const results = await executeBetPlacement({
        selections: [selection],
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].betId).toBe("bet-001");
    });

    it("handles API error during single bet placement", async () => {
      const selection = createMockSelection({ odds: 1.85 });

      vi.mocked(placeBetMutation).mockRejectedValue(new Error("Odds have changed"));

      const results = await executeBetPlacement({
        selections: [selection],
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });
  });

  describe("Parlay bet placement", () => {
    it("validates and places a parlay bet", async () => {
      const selections = createMockSelections(3);
      selections.forEach((s, i) => {
        s.odds = 1.5 + Math.random();
        s.active = true;
        // Parlays must combine selections from different fixtures
        s.fixtureId = `f${i + 1}`;
      });

      // Validate
      const totalStake = calculateTotalStake(selections, "parlay", 1000);
      expect(totalStake).toBe(1000); // Single stake for parlay

      const errors = validateSlip(selections, 50000, totalStake, "parlay");
      expect(errors).toHaveLength(0);

      // Calculate potential return
      const potentialReturn = calculatePotentialReturn(selections, "parlay", 1000);
      expect(potentialReturn).toBeGreaterThan(1000);

      // Mock API
      vi.mocked(placeBetMutation).mockResolvedValue(mockPlaceBetResponse.data.placeBet);

      const results = await executeBetPlacement({
        selections,
        mode: "parlay",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      // All parlay results share the same betId
      const betIds = new Set(results.map((r) => r.betId));
      expect(betIds.size).toBe(1);
    });
  });

  describe("Partial failure handling", () => {
    it("continues placing singles when one fails", async () => {
      const selections = createMockSelections(3);
      selections.forEach((s) => (s.odds = 2.0));

      let callCount = 0;
      vi.mocked(placeBetMutation).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Odds have changed");
        }
        return mockPlaceBetResponse.data.placeBet;
      });

      const results = await executeBetPlacement({
        selections,
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results).toHaveLength(3);
      // First and third succeed, second fails
      expect(results.filter((r) => r.success)).toHaveLength(2);
      expect(results.filter((r) => !r.success)).toHaveLength(1);
    });

    it("reports failure on parlay when API call fails", async () => {
      const selections = createMockSelections(2);
      selections.forEach((s, i) => {
        s.odds = 2.0;
        // Parlays must combine selections from different fixtures
        s.fixtureId = `f${i + 1}`;
      });

      vi.mocked(placeBetMutation).mockRejectedValue(new Error("Odds have changed"));

      const results = await executeBetPlacement({
        selections,
        mode: "parlay",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      // All selections get a failure result
      expect(results).toHaveLength(2);
      expect(results.every((r) => !r.success)).toBe(true);
      expect(results.every((r) => r.error === "Odds have changed")).toBe(true);
    });
  });

  describe("Validation before placement", () => {
    it("rejects empty slip", async () => {
      const results = await executeBetPlacement({
        selections: [],
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results).toHaveLength(0);
    });

    it("rejects insufficient balance", async () => {
      const selections = createMockSelections(2);
      selections.forEach((s) => (s.odds = 2.0));

      const results = await executeBetPlacement({
        selections,
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 500, // Not enough for 2000
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => !r.success)).toBe(true);
    });

    it("rejects slip with inactive selection", async () => {
      const selections = [
        createMockSelection({ active: true }),
        createMockSelection({ id: "sel-2", active: false }),
      ];

      const results = await executeBetPlacement({
        selections,
        mode: "singles",
        stakePerLeg: 1000,
        currency: "NGN",
        balance: 50000,
      });

      expect(results.every((r) => !r.success)).toBe(true);
    });

    it("rejects zero stake", async () => {
      const selections = createMockSelections(1);

      const results = await executeBetPlacement({
        selections,
        mode: "singles",
        stakePerLeg: 0,
        currency: "NGN",
        balance: 50000,
      });

      expect(results.every((r) => !r.success)).toBe(true);
    });
  });

  describe("Slip state management", () => {
    it("add/remove selections from slip", () => {
      const slip: ReturnType<typeof createMockSelection>[] = [];

      const sel1 = createMockSelection({ id: "sel-1" });
      const sel2 = createMockSelection({ id: "sel-2" });

      // Add
      slip.push(sel1);
      slip.push(sel2);
      expect(slip).toHaveLength(2);

      // Remove first
      const idx = slip.findIndex((s) => s.id === "sel-1");
      slip.splice(idx, 1);
      expect(slip).toHaveLength(1);
      expect(slip[0].id).toBe("sel-2");

      // Clear
      slip.length = 0;
      expect(slip).toHaveLength(0);
    });

    it("toggle between singles and parlay changes calculation", () => {
      const selections = createMockSelections(3);
      selections.forEach((s) => (s.odds = 2.0));

      const singlesReturn = calculatePotentialReturn(selections, "singles", 1000);
      const parlayReturn = calculatePotentialReturn(selections, "parlay", 1000);

      // Singles: 3 * 1000 * 2.0 = 6000
      expect(singlesReturn).toBe(6000);
      // Parlay: 1000 * 2.0 * 2.0 * 2.0 = 8000
      expect(parlayReturn).toBe(8000);
    });
  });
});
