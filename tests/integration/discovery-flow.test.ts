/**
 * Integration tests for the discovery flow:
 * search → select fixture → apply market → add to slip.
 * @module tests/integration/discovery-flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    graphqlSuccess,
    graphqlError,
    mockSportIndexResponse,
    mockFixtureDetailsResponse,
    createMockSelection,
} from "../fixtures/mock-stake-responses";
import { executeQuery } from "@/lib/stake-api/client";
import { getSportIndex } from "@/lib/stake-api/queries";
import { resetRateLimiter } from "@/lib/stake-api/rate-limiter";
import {
    calculatePotentialReturn,
    calculateTotalStake,
    validateSlip,
    canPlaceBet,
} from "@/lib/state/slipLogic";

describe("Discovery Flow Integration", () => {
    beforeEach(() => {
        resetRateLimiter();
        vi.restoreAllMocks();
    });

    it("fetches sport index → extracts fixtures → builds selections", async () => {
        // Mock the API response
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(graphqlSuccess(mockSportIndexResponse.data)),
        );

        // 1. Fetch sport index
        const sportData = await getSportIndex("football", "main", "popular", 1);

        expect(sportData.sport).toBeDefined();
        expect(sportData.sport.categories.length).toBeGreaterThan(0);

        // 2. Extract fixtures from tournaments
        const fixtures: Array<{ id: string; name: string; slug: string }> = [];
        for (const category of sportData.sport.categories) {
            for (const tournament of category.tournaments) {
                for (const fixture of tournament.fixtures) {
                    fixtures.push({ id: fixture.id, name: fixture.name, slug: fixture.slug });
                }
            }
        }

        expect(fixtures.length).toBeGreaterThan(0);
        expect(fixtures[0].name).toBe("Arsenal vs Chelsea");
        expect(fixtures[1].name).toBe("Liverpool vs Man United");
    });

    it("creates selection from fixture and adds to slip", () => {
        // Simulate user selecting Arsenal to win
        const selection = createMockSelection({
            fixtureId: "f1",
            fixtureSlug: "arsenal-vs-chelsea",
            fixtureName: "Arsenal vs Chelsea",
            marketId: "m1",
            marketName: "Match Winner",
            outcomeId: "o1",
            outcomeName: "Arsenal",
            odds: 1.85,
            active: true,
        });

        // Validate the selection
        const selections = [selection];
        const errors = validateSlip(selections, 50000, 1000);
        expect(errors).toHaveLength(0);
        expect(canPlaceBet(selections, 50000, 1000)).toBe(true);

        // Calculate potential return
        const returnAmount = calculatePotentialReturn(selections, "singles", 1000);
        expect(returnAmount).toBe(1850); // 1000 * 1.85
    });

    it("adds multiple selections and calculates parlay", () => {
        const selections = [
            createMockSelection({
                id: "sel-1",
                outcomeId: "o1",
                outcomeName: "Arsenal",
                odds: 1.85,
            }),
            createMockSelection({
                id: "sel-2",
                outcomeId: "o2",
                outcomeName: "Draw",
                odds: 3.50,
            }),
        ];

        // Calculate singles
        const singlesReturn = calculatePotentialReturn(selections, "singles", 1000);
        // 1000 * 1.85 + 1000 * 3.50 = 5350
        expect(singlesReturn).toBe(5350);

        // Calculate parlay
        const parlayReturn = calculatePotentialReturn(selections, "parlay", 1000);
        // 1000 * (1.85 * 3.50) = 6475
        expect(parlayReturn).toBe(6475);

        // Validate
        const errors = validateSlip(selections, 50000, 1000);
        expect(errors).toHaveLength(0);
    });

    it("detects duplicate selections in slip", () => {
        const selections = [
            createMockSelection({ id: "sel-1", outcomeId: "o1" }),
            createMockSelection({ id: "sel-2", outcomeId: "o1" }), // same outcome
        ];

        const errors = validateSlip(selections, 50000, 2000);
        expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
        expect(canPlaceBet(selections, 50000, 2000)).toBe(false);
    });

    it("handles fixture with suspended market", () => {
        const selection = createMockSelection({ active: false });
        const selections = [selection];

        const errors = validateSlip(selections, 50000, 1000);
        expect(errors.some((e) => e.includes("no longer available"))).toBe(true);
    });

    it("full flow: search → select → validate → calculate", () => {
        // Step 1: Search results come back (mock)
        const searchResults = [
            { id: "f1", name: "Arsenal vs Chelsea", tournament: "Premier League" },
            { id: "f2", name: "Liverpool vs Man United", tournament: "Premier League" },
        ];
        expect(searchResults.length).toBe(2);

        // Step 2: User selects a fixture and picks a market
        const selection1 = createMockSelection({
            id: "flow-sel-1",
            fixtureId: "f1",
            fixtureName: "Arsenal vs Chelsea",
            outcomeId: "o1",
            outcomeName: "Arsenal",
            odds: 1.85,
        });

        const selection2 = createMockSelection({
            id: "flow-sel-2",
            fixtureId: "f2",
            fixtureName: "Liverpool vs Man United",
            outcomeId: "o2",
            outcomeName: "Liverpool",
            odds: 2.10,
        });

        // Step 3: Both added to slip
        const slip = [selection1, selection2];

        // Step 4: Validate
        expect(validateSlip(slip, 50000, 2000)).toHaveLength(0);

        // Step 5: Calculate
        expect(calculateTotalStake(slip, "singles", 1000)).toBe(2000);
        expect(calculatePotentialReturn(slip, "singles", 1000)).toBe(3950);
        // 1000 * 1.85 + 1000 * 2.10 = 3950
    });
});
