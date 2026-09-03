/**
 * Unit tests for BetArchitect validators.
 * @module tests/unit/betarchitect/validators
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  hasSameMatch,
  hasMutuallyExclusiveLegs,
  groupByMatch,
} from "@/lib/betarchitect/validators";
import { mockFixture, resetIds } from "./helpers";

beforeEach(() => {
  resetIds();
});

describe("hasSameMatch", () => {
  it("returns false when all legs are from different matches", () => {
    const legs = [
      mockFixture({ matchId: "m1" }),
      mockFixture({ matchId: "m2" }),
      mockFixture({ matchId: "m3" }),
    ];
    expect(hasSameMatch(legs)).toBe(false);
  });

  it("returns true when two legs share the same match", () => {
    const legs = [
      mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5" }),
      mockFixture({ matchId: "m1", market: "Match Result", selection: "Home" }),
    ];
    expect(hasSameMatch(legs)).toBe(true);
  });

  it("returns false for a single leg", () => {
    expect(hasSameMatch([mockFixture()])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(hasSameMatch([])).toBe(false);
  });
});

describe("hasMutuallyExclusiveLegs", () => {
  it("returns false when no two legs from the same match share a market", () => {
    const legs = [
      mockFixture({ matchId: "m1", market: "Over/Under 2.5" }),
      mockFixture({ matchId: "m1", market: "Match Result" }),
      mockFixture({ matchId: "m2", market: "Over/Under 2.5" }),
    ];
    expect(hasMutuallyExclusiveLegs(legs)).toBe(false);
  });

  it("returns true when two legs from the same match target the same market", () => {
    const legs = [
      mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Over 2.5" }),
      mockFixture({ matchId: "m1", market: "Over/Under 2.5", selection: "Under 2.5" }),
    ];
    expect(hasMutuallyExclusiveLegs(legs)).toBe(true);
  });

  it("returns false for legs from different matches with the same market", () => {
    const legs = [
      mockFixture({ matchId: "m1", market: "Over/Under 2.5" }),
      mockFixture({ matchId: "m2", market: "Over/Under 2.5" }),
    ];
    expect(hasMutuallyExclusiveLegs(legs)).toBe(false);
  });

  it("returns false for a single leg", () => {
    expect(hasMutuallyExclusiveLegs([mockFixture()])).toBe(false);
  });
});

describe("groupByMatch", () => {
  it("groups legs by matchId", () => {
    const legs = [
      mockFixture({ matchId: "m1" }),
      mockFixture({ matchId: "m2" }),
      mockFixture({ matchId: "m1" }),
    ];
    const groups = groupByMatch(legs);
    expect(groups.size).toBe(2);
    expect(groups.get("m1")).toHaveLength(2);
    expect(groups.get("m2")).toHaveLength(1);
  });

  it("returns an empty map for empty input", () => {
    const groups = groupByMatch([]);
    expect(groups.size).toBe(0);
  });
});
