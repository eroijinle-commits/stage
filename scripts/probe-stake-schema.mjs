/**
 * Schema Probe Script for Stake.com GraphQL API
 *
 * Paste into the browser console on https://stake.com/sports
 * It sends each query your app uses and reports what succeeds/fails.
 *
 * Usage:
 *   1. Open https://stake.com/sports (logged in)
 *   2. DevTools Console → paste this entire script
 *   3. Wait for results → check the "Stake Probe Results" table
 */

(async () => {
  "use strict";

  const ENDPOINT = "https://stake.com/_api/graphql";
  const HEADERS = {
    "Content-Type": "application/json",
    "x-language": "en",
    "x-operation-type": "query",
  };

  // Add auth token if available
  const token = localStorage.getItem("stake-api-token");
  if (token) HEADERS["x-access-token"] = token;

  // ── All 7 queries your app uses ───────────────────────────────────────

  const probes = [
    {
      name: "1. SportList",
      operationType: "query",
      operationName: "SportList",
      query: `query SportList {
        sportList {
          id
          name
          slug
        }
      }`,
      variables: {},
    },
    {
      name: "2. StakeBalances",
      operationType: "query",
      operationName: "StakeBalances",
      query: `query StakeBalances {
        user {
          balances {
            available {
              amount
              currency
            }
            vault {
              amount
              currency
            }
          }
        }
      }`,
      variables: {},
    },
    {
      name: "3. SportDiscovery (needs sportId)",
      operationType: "query",
      operationName: "SportDiscovery",
      // Uses a dummy sportId — will test field structure even if ID is wrong
      query: `query SportDiscovery($sportId: String!) {
        sport(sportId: $sportId) {
          id
          name
          slug
          categoryList {
            id
            name
            slug
            tournamentList {
              id
              name
              slug
              fixtureList {
                id
                name
                slug
                status
                marketCount
                data {
                  ... on SportFixtureDataMatch {
                    __typename
                    startTime
                    isOutright
                    competitors {
                      name
                      defaultName
                      extId
                      countryCode
                      abbreviation
                      iconPath
                      country
                    }
                    teams {
                      extId
                      name
                      qualifier
                    }
                  }
                  ... on SportFixtureDataOutright {
                    __typename
                    name
                    startTime
                    endTime
                    isOutright
                  }
                }
                eventStatus {
                  ... on SportFixtureEventStatusData {
                    matchStatus
                    homeScore
                    awayScore
                    homeGameScore
                    awayGameScore
                    clock {
                      matchTime
                      remainingTime
                      stopped
                    }
                    periodScores {
                      homeScore
                      awayScore
                      matchStatus
                    }
                    statistic {
                      corners { home away }
                      yellowCards { home away }
                      redCards { home away }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      variables: { sportId: "1" }, // soccer = "1" typically
    },
    {
      name: "4. FixturePage_SlugFixture (needs real slug)",
      operationType: "query",
      operationName: "FixturePage_SlugFixture",
      // Uses a known fixture slug from your scraped data
      query: `query FixturePage_SlugFixture($fixture: String!, $groups: [String!]!) {
        slugFixture(fixture: $fixture) {
          id
          name
          slug
          status
          customBetAvailable
          liveWidgetUrl
          widgetUrl
          streamExists
          marketCount
          data {
            ... on SportFixtureDataMatch {
              __typename
              startTime
              isOutright
              competitors {
                name
                defaultName
                extId
                countryCode
                abbreviation
                iconPath
                country
              }
              teams {
                extId
                name
                qualifier
              }
            }
            ... on SportFixtureDataOutright {
              __typename
              name
              startTime
              endTime
              isOutright
            }
          }
          eventStatus {
            ... on SportFixtureEventStatusData {
              matchStatus
              homeScore
              awayScore
              homeGameScore
              awayGameScore
              clock {
                matchTime
                remainingTime
                stopped
              }
              periodScores {
                homeScore
                awayScore
                matchStatus
              }
              statistic {
                corners { home away }
                yellowCards { home away }
                redCards { home away }
              }
            }
          }
          tournament {
            id
            name
            slug
            category {
              id
              name
              slug
              sport {
                id
                name
                slug
              }
            }
          }
          group: groups(groups: $groups) {
            name
            translation
            rank
            templates(includeEmpty: false) {
              id
              extId
              rank
              name
              markets {
                id
                name
                status
                extId
                specifiers
                customBetAvailable
                provider
                templateExtId
                outcomes {
                  id
                  active
                  odds
                  name
                  customBetAvailable
                  extId
                }
              }
            }
          }
          groups {
            name
            translation
          }
        }
      }`,
      variables: { fixture: "46818366-leeds-united-brentford", groups: ["main"] },
    },
    {
      name: "5. StakeBetHistory",
      operationType: "query",
      operationName: "StakeBetHistory",
      query: `query StakeBetHistory($limit: Int!, $offset: Int!, $status: [SportBetStatusEnum!]) {
        user {
          sportBetHistory(limit: $limit, offset: $offset, status: $status) {
            id
            amount
            currency
            status
            betType
            payoutMultiplier
            potentialMultiplier
            totalOdds
            stakePerLeg
            createdAt
            settledAt
            outcomes {
              id
              name
              odds
              market {
                name
              }
              fixture {
                name
                slug
              }
              result
              status
            }
          }
          sportBetCount(status: $status)
        }
      }`,
      variables: { limit: 5, offset: 0, status: null },
    },
    {
      name: "6. StakeActiveBetCount",
      operationType: "query",
      operationName: "StakeActiveBetCount",
      query: `query StakeActiveBetCount {
        user {
          activeBetCount
          activeBetsByType {
            type
            count
          }
        }
      }`,
      variables: {},
    },
    {
      name: "7. SportBet mutation (PROBE ONLY — sends minimal test)",
      operationType: "mutation",
      operationName: "SportBetSlip",
      // This is a PROBE — it tests the query structure without actually placing a bet
      // by using invalid outcome IDs that will fail at the business logic layer
      // (not the GraphQL layer), proving the query structure is valid.
      query: `mutation SportBetSlip(
        $outcomeIds: [String!]!,
        $amount: Float!,
        $currency: CurrencyEnum!,
        $betType: SportBetTypeEnum!,
        $oddsChange: SportOddsChangeEnum!,
        $stakeShieldEnabled: Boolean
      ) {
        sportBet(
          outcomeIds: $outcomeIds,
          amount: $amount,
          currency: $currency,
          betType: $betType,
          oddsChange: $oddsChange,
          stakeShieldEnabled: $stakeShieldEnabled
        ) {
          id
          amount
          currency
          potentialMultiplier
          outcomes {
            id
            odds
            market
            fixtureName
          }
          customPrices {
            customOdds
            type
            stakeShield {
              offerOdds
              protectionLevel
            }
          }
          status
          createdAt
        }
      }`,
      variables: {
        outcomeIds: ["probe-test-000"],
        amount: 0.01,
        currency: "NGN",
        betType: "sports",
        oddsChange: "higher",
        stakeShieldEnabled: false,
      },
    },
  ];

  // ── Run probes ────────────────────────────────────────────────────────

  console.log("═".repeat(60));
  console.log("  Stake GraphQL Schema Probe");
  console.log("═".repeat(60));
  console.log("");

  const results = [];

  for (const probe of probes) {
    console.log(`⏳ Testing: ${probe.name}...`);

    try {
      const headers = { ...HEADERS, "x-operation-type": probe.operationType };
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: probe.query,
          variables: probe.variables,
          operationName: probe.operationName,
        }),
      });

      const body = await res.json();

      if (body.errors && body.errors.length > 0) {
        const errMsgs = body.errors.map((e) => e.message).join("; ");
        // Check if it's a GraphQL field error (schema issue) vs business logic error
        const isSchemaError =
          errMsgs.includes("Cannot query field") ||
          errMsgs.includes("cannot be fetched") ||
          errMsgs.includes("Unknown field");
        const isAuthError =
          res.status === 401 ||
          errMsgs.includes("unauthorized") ||
          errMsgs.includes("Not authenticated");
        const isBusinessLogic = !isSchemaError && !isAuthError && res.status === 200;

        results.push({
          name: probe.name,
          status: isAuthError
            ? "⚠️ AUTH"
            : isBusinessLogic
              ? "✅ OK (logic err)"
              : "❌ SCHEMA ERROR",
          httpStatus: res.status,
          errors: errMsgs.slice(0, 200),
          data: body.data ? JSON.stringify(body.data).slice(0, 150) : null,
        });

        if (isSchemaError) {
          console.error(`  ❌ SCHEMA ERROR: ${errMsgs}`);
        } else if (isAuthError) {
          console.warn(`  ⚠️  AUTH REQUIRED: ${errMsgs}`);
        } else {
          console.log(`  ✅ Query valid (business logic rejection is expected)`);
          if (body.errors) console.log(`     Logic errors: ${errMsgs.slice(0, 150)}`);
        }
      } else {
        results.push({
          name: probe.name,
          status: "✅ OK",
          httpStatus: res.status,
          errors: null,
          data: body.data ? JSON.stringify(body.data).slice(0, 150) : null,
        });
        console.log(`  ✅ Success!`);
        if (body.data) console.log(`     Data: ${JSON.stringify(body.data).slice(0, 150)}`);
      }
    } catch (err) {
      results.push({
        name: probe.name,
        status: "💥 FETCH ERROR",
        httpStatus: null,
        errors: err.message,
        data: null,
      });
      console.error(`  💥 Error: ${err.message}`);
    }
  }

  // ── Summary table ─────────────────────────────────────────────────────

  console.log("");
  console.log("═".repeat(60));
  console.log("  RESULTS SUMMARY");
  console.log("═".repeat(60));
  console.table(results);

  // Copy results to clipboard
  const json = JSON.stringify(results, null, 2);
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(json);
    console.log("\n✓ Results copied to clipboard — paste them back in the chat");
  }

  window.__stakeProbeResults = results;
  console.log("✓ Also stored in window.__stakeProbeResults");
})();
