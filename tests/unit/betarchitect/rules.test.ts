/**
 * Unit tests for BetArchitect rules engine.
 * @module tests/unit/betarchitect/rules
 */

import { describe, it, expect, beforeEach } from "vitest";
import { applyRules, DEFAULT_RULES } from "@/lib/betarchitect/rules";
import { mockFixture, resetIds } from "./helpers";

beforeEach(() => {
  resetIds();
});

describe("applyRules", () => {
  describe("R1 — same match", () => {
    it("passes when all legs are from different matches", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 1.5 }),
        mockFixture({ matchId: "m2", odds: 1.5 }),
      ];
      const r1 = applyRules(legs).find((r) => r.rule === "R1")!;
      expect(r1.passed).toBe(true);
      expect(r1.severity).toBe("hard");
    });

    it("fails when two legs share the same match", () => {
      const legs = [
        mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5", odds: 1.5 }),
        mockFixture({ matchId: "m1", market: "Match Result", selection: "Home", odds: 1.5 }),
      ];
      const r1 = applyRules(legs).find((r) => r.rule === "R1")!;
      expect(r1.passed).toBe(false);
    });
  });

  describe("R2 — mutually exclusive legs", () => {
    it("passes when no conflicting legs", () => {
      const legs = [
        mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5", odds: 1.5 }),
        mockFixture({ matchId: "m1", market: "Match Result", selection: "Home", odds: 1.5 }),
      ];
      const r2 = applyRules(legs).find((r) => r.rule === "R2")!;
      expect(r2.passed).toBe(true);
      expect(r2.severity).toBe("hard");
    });

    it("fails when same-market legs exist for one match", () => {
      const legs = [
        mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5", odds: 1.5 }),
        mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Under 2.5", odds: 1.5 }),
      ];
      const r2 = applyRules(legs).find((r) => r.rule === "R2")!;
      expect(r2.passed).toBe(false);
    });
  });

  describe("R3 — minimum odds", () => {
    it("passes when all legs meet the threshold", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 1.2 }),
        mockFixture({ matchId: "m2", odds: 1.5 }),
      ];
      const r3 = applyRules(legs).find((r) => r.rule === "R3")!;
      expect(r3.passed).toBe(true);
      expect(r3.severity).toBe("soft");
    });

    it("fails when a leg is below the threshold", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 1.05 }),
        mockFixture({ matchId: "m2", odds: 1.5 }),
      ];
      const r3 = applyRules(legs).find((r) => r.rule === "R3")!;
      expect(r3.passed).toBe(false);
    });
  });

  describe("R4 — combined odds", () => {
    it("passes when combined odds are within limit", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 1.5 }),
        mockFixture({ matchId: "m2", odds: 1.5 }),
      ];
      const r4 = applyRules(legs).find((r) => r.rule === "R4")!;
      expect(r4.passed).toBe(true);
    });

    it("fails when combined odds exceed the limit", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 4.0 }),
        mockFixture({ matchId: "m2", odds: 4.0 }),
      ];
      const r4 = applyRules(legs).find((r) => r.rule === "R4")!;
      expect(r4.passed).toBe(false);
    });
  });

  describe("R5 — sport diversification", () => {
    it("passes when sport count is within limit", () => {
      const legs = [
        mockFixture({ matchId: "m1", sport: "soccer", odds: 1.5 }),
        mockFixture({ matchId: "m2", sport: "soccer", odds: 1.5 }),
        mockFixture({ matchId: "m3", sport: "soccer", odds: 1.5 }),
      ];
      const r5 = applyRules(legs).find((r) => r.rule === "R5")!;
      expect(r5.passed).toBe(true);
    });

    it("fails when too many legs from one sport", () => {
      const legs = [
        mockFixture({ matchId: "m1", sport: "soccer", odds: 1.5 }),
        mockFixture({ matchId: "m2", sport: "soccer", odds: 1.5 }),
        mockFixture({ matchId: "m3", sport: "soccer", odds: 1.5 }),
        mockFixture({ matchId: "m4", sport: "soccer", odds: 1.5 }),
      ];
      const r5 = applyRules(legs).find((r) => r.rule === "R5")!;
      expect(r5.passed).toBe(false);
    });
  });

  describe("R6 — league diversification", () => {
    it("passes when league count is within limit", () => {
      const legs = [
        mockFixture({ matchId: "m1", league: "Premier League", odds: 1.5 }),
        mockFixture({ matchId: "m2", league: "Premier League", odds: 1.5 }),
      ];
      const r6 = applyRules(legs).find((r) => r.rule === "R6")!;
      expect(r6.passed).toBe(true);
    });

    it("fails when too many legs from one league", () => {
      const legs = [
        mockFixture({ matchId: "m1", league: "Premier League", odds: 1.5 }),
        mockFixture({ matchId: "m2", league: "Premier League", odds: 1.5 }),
        mockFixture({ matchId: "m3", league: "Premier League", odds: 1.5 }),
      ];
      const r6 = applyRules(legs).find((r) => r.rule === "R6")!;
      expect(r6.passed).toBe(false);
    });
  });

  describe("R7 — correlation (info)", () => {
    it("always passes as an info flag", () => {
      const legs = [mockFixture({ matchId: "m1", odds: 1.5 })];
      const r7 = applyRules(legs).find((r) => r.rule === "R7")!;
      expect(r7.passed).toBe(true);
      expect(r7.severity).toBe("info");
    });
  });

  describe("returns all 7 rules", () => {
    it("returns exactly 7 RuleResult items", () => {
      const results = applyRules([mockFixture()]);
      expect(results).toHaveLength(7);
    });
  });

  describe("custom settings", () => {
    it("respects custom minLegOdds", () => {
      const legs = [
        mockFixture({ matchId: "m1", odds: 1.15 }),
        mockFixture({ matchId: "m2", odds: 1.15 }),
      ];
      // Default minLegOdds is 1.1 — 1.15 passes
      const r3Default = applyRules(legs).find((r) => r.rule === "R3")!;
      expect(r3Default.passed).toBe(true);

      // Custom minLegOdds of 1.2 — 1.15 fails
      const r3Custom = applyRules(legs, { ...DEFAULT_RULES, minLegOdds: 1.2 }).find(
        (r) => r.rule === "R3",
      )!;
      expect(r3Custom.passed).toBe(false);
    });
  });
});
