/**
 * Unit tests for BetArchitect strategy generators.
 * @module tests/unit/betarchitect/generators
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSlipFromLegs, isValidSlip } from "@/lib/betarchitect/generators";
import { generateFortress } from "@/lib/betarchitect/strategies/fortress";
import { generateGrowth } from "@/lib/betarchitect/strategies/growth";
import { generateUpside } from "@/lib/betarchitect/strategies/upside";
import { generateSystem78 } from "@/lib/betarchitect/strategies/system78";
import { DEFAULT_RULES } from "@/lib/betarchitect/rules";
import { mockFixture, resetIds } from "./helpers";

beforeEach(() => {
  resetIds();
});

describe("createSlipFromLegs", () => {
  it("builds an ArchitectSlip from legs", () => {
    const legs = [
      mockFixture({ matchId: "m1", odds: 2.0 }),
      mockFixture({ matchId: "m2", odds: 2.0 }),
    ];
    const slip = createSlipFromLegs(legs, "fortress", 0);
    expect(slip.strategy).toBe("fortress");
    expect(slip.legs).toHaveLength(2);
    expect(slip.combinedOdds).toBe(4.0);
    expect(slip.id).toContain("fortress-0");
  });

  it("rounds combined odds to 2 decimals", () => {
    const legs = [
      mockFixture({ matchId: "m1", odds: 1.33 }),
      mockFixture({ matchId: "m2", odds: 1.5 }),
    ];
    const slip = createSlipFromLegs(legs, "growth", 1);
    expect(slip.combinedOdds).toBeCloseTo(1.995, 1);
  });
});

describe("isValidSlip", () => {
  it("returns true for valid legs", () => {
    const legs = [
      mockFixture({ matchId: "m1", odds: 1.5 }),
      mockFixture({ matchId: "m2", odds: 1.5 }),
    ];
    expect(isValidSlip(legs, DEFAULT_RULES)).toBe(true);
  });

  it("returns false when legs share the same match", () => {
    const legs = [
      mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5", odds: 1.5 }),
      mockFixture({ matchId: "m1", market: "Match Result", selection: "Home", odds: 1.5 }),
    ];
    expect(isValidSlip(legs, DEFAULT_RULES)).toBe(false);
  });
});

describe("generateFortress", () => {
  it("generates slips from a valid pool", () => {
    const pool = Array.from({ length: 6 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.3, sport: "soccer", league: "PL" }),
    );
    const slips = generateFortress(pool, DEFAULT_RULES);
    expect(slips.length).toBeGreaterThan(0);
    expect(slips.length).toBeLessThanOrEqual(6);
  });

  it("each slip has exactly 4 legs", () => {
    const pool = Array.from({ length: 8 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.3, sport: "soccer", league: "PL" }),
    );
    const slips = generateFortress(pool, DEFAULT_RULES);
    for (const slip of slips) {
      expect(slip.legs).toHaveLength(4);
      expect(slip.strategy).toBe("fortress");
    }
  });

  it("returns empty when pool is too small", () => {
    const pool = [mockFixture({ matchId: "m1", odds: 1.5 })];
    const slips = generateFortress(pool, DEFAULT_RULES);
    expect(slips).toHaveLength(0);
  });

  it("generates no more than maxSlips", () => {
    const pool = Array.from({ length: 20 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.3, sport: "soccer", league: "PL" }),
    );
    const slips = generateFortress(pool, DEFAULT_RULES);
    expect(slips.length).toBeLessThanOrEqual(6);
  });
});

describe("generateGrowth", () => {
  it("generates slips from a sufficiently large pool", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.5, sport: "soccer", league: "PL" }),
    );
    const slips = generateGrowth(pool, DEFAULT_RULES);
    expect(slips.length).toBeGreaterThan(0);
  });

  it("each slip has 6-8 legs", () => {
    const pool = Array.from({ length: 14 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.5, sport: "soccer", league: "PL" }),
    );
    const slips = generateGrowth(pool, DEFAULT_RULES);
    for (const slip of slips) {
      expect(slip.legs.length).toBeGreaterThanOrEqual(6);
      expect(slip.legs.length).toBeLessThanOrEqual(8);
      expect(slip.strategy).toBe("growth");
    }
  });

  it("returns empty when pool is too small", () => {
    const pool = Array.from({ length: 4 }, (_, i) => mockFixture({ matchId: `m${i}`, odds: 1.5 }));
    const slips = generateGrowth(pool, DEFAULT_RULES);
    expect(slips).toHaveLength(0);
  });
});

describe("generateUpside", () => {
  it("generates slips from a large pool", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 2.0 + i * 0.2, sport: "soccer", league: "PL" }),
    );
    const slips = generateUpside(pool, DEFAULT_RULES);
    expect(slips.length).toBeGreaterThan(0);
  });

  it("each slip has 8-10 legs", () => {
    const pool = Array.from({ length: 14 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 2.0 + i * 0.3, sport: "soccer", league: "PL" }),
    );
    const slips = generateUpside(pool, DEFAULT_RULES);
    for (const slip of slips) {
      expect(slip.legs.length).toBeGreaterThanOrEqual(8);
      expect(slip.legs.length).toBeLessThanOrEqual(10);
      expect(slip.strategy).toBe("upside");
    }
  });

  it("returns empty when pool is too small", () => {
    const pool = Array.from({ length: 6 }, (_, i) => mockFixture({ matchId: `m${i}`, odds: 1.5 }));
    const slips = generateUpside(pool, DEFAULT_RULES);
    expect(slips).toHaveLength(0);
  });
});

describe("generateSystem78", () => {
  it("generates 7-leg combos from an 8-leg base", () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.5, sport: "soccer", league: "PL" }),
    );
    const slips = generateSystem78(pool, DEFAULT_RULES);
    expect(slips.length).toBeGreaterThan(0);
  });

  it("each slip has exactly 7 legs", () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      mockFixture({ matchId: `m${i}`, odds: 1.5, sport: "soccer", league: "PL" }),
    );
    const slips = generateSystem78(pool, DEFAULT_RULES);
    for (const slip of slips) {
      expect(slip.legs).toHaveLength(7);
      expect(slip.strategy).toBe("system");
    }
  });

  it("returns empty when pool is too small for 8-leg base", () => {
    const pool = Array.from({ length: 6 }, (_, i) => mockFixture({ matchId: `m${i}`, odds: 1.5 }));
    const slips = generateSystem78(pool, DEFAULT_RULES);
    expect(slips).toHaveLength(0);
  });
});
