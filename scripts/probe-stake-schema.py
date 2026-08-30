#!/usr/bin/env python3
"""
Stake.com GraphQL Schema Probe

Sends each query your app uses against the Stake API and reports
which fields are valid vs invalid.

Usage:
    # Without auth (public queries only):
    python3 scripts/probe-stake-schema.py

    # With auth (all queries including user-specific ones):
    STAKE_TOKEN="your-api-token" python3 scripts/probe-stake-schema.py

    # Or pass token directly:
    python3 scripts/probe-stake-schema.py --token "your-api-token"

The script prints a summary table and saves full results to stake-probe-results.json.
"""

import json
import os
import sys
import urllib.request
import urllib.error

ENDPOINT = "https://stake.com/_api/graphql"

# Browser-like headers to bypass bot protection
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://stake.com",
    "Referer": "https://stake.com/sports",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

# ── All 7 GraphQL operations your app uses ───────────────────────────────

PROBES = [
    {
        "name": "1. SportList",
        "operationType": "query",
        "operationName": "SportList",
        "query": """query SportList {
            sportList {
                id
                name
                slug
            }
        }""",
        "variables": {},
    },
    {
        "name": "2. StakeBalances",
        "operationType": "query",
        "operationName": "StakeBalances",
        "query": """query StakeBalances {
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
        }""",
        "variables": {},
    },
    {
        "name": "3. SportDiscovery",
        "operationType": "query",
        "operationName": "SportDiscovery",
        "query": """query SportDiscovery($sportId: String!) {
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
        }""",
        "variables": {"sportId": "1"},
    },
    {
        "name": "4. FixturePage_SlugFixture",
        "operationType": "query",
        "operationName": "FixturePage_SlugFixture",
        "query": """query FixturePage_SlugFixture($fixture: String!, $groups: [String!]!) {
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
        }""",
        "variables": {"fixture": "46818366-leeds-united-brentford", "groups": ["main"]},
    },
    {
        "name": "5. StakeBetHistory",
        "operationType": "query",
        "operationName": "StakeBetHistory",
        "query": """query StakeBetHistory($limit: Int!, $offset: Int!, $status: [SportBetStatusEnum!]) {
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
        }""",
        "variables": {"limit": 5, "offset": 0, "status": None},
    },
    {
        "name": "6. StakeActiveBetCount",
        "operationType": "query",
        "operationName": "StakeActiveBetCount",
        "query": """query StakeActiveBetCount {
            user {
                activeBetCount
                activeBetsByType {
                    type
                    count
                }
            }
        }""",
        "variables": {},
    },
    {
        "name": "7. SportBet mutation (probe)",
        "operationType": "mutation",
        "operationName": "SportBetSlip",
        "query": """mutation SportBetSlip(
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
        }""",
        "variables": {
            "outcomeIds": ["probe-test-000"],
            "amount": 0.01,
            "currency": "NGN",
            "betType": "sports",
            "oddsChange": "higher",
            "stakeShieldEnabled": False,
        },
    },
]


def send_probe(probe: dict, token: str | None = None) -> dict:
    """Send a single GraphQL probe and return the result."""
    headers = {
        **BROWSER_HEADERS,
        "Content-Type": "application/json",
        "x-language": "en",
        "x-operation-type": probe["operationType"],
    }
    if token:
        headers["x-access-token"] = token

    payload = json.dumps({
        "query": probe["query"],
        "variables": probe["variables"],
        "operationName": probe["operationName"],
    }).encode("utf-8")

    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        status_code = e.code
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {"errors": [{"message": f"HTTP {e.code}: {e.reason}"}]}
    except Exception as e:
        return {
            "name": probe["name"],
            "status": "FETCH_ERROR",
            "httpStatus": None,
            "errors": str(e),
            "data": None,
        }

    errors = body.get("errors", [])
    data = body.get("data")

    if errors:
        error_msgs = "; ".join(err.get("message", "unknown") for err in errors)
        is_schema_error = any(
            kw in error_msgs
            for kw in ["Cannot query field", "cannot be fetched", "Unknown field"]
        )
        is_auth_error = status_code == 401 or any(
            kw in error_msgs.lower()
            for kw in ["unauthorized", "not authenticated", "not signed in"]
        )
        is_business_logic = not is_schema_error and not is_auth_error and status_code == 200

        if is_auth_error:
            status = "AUTH_REQUIRED"
        elif is_business_logic:
            status = "OK (business logic err)"
        else:
            status = "SCHEMA_ERROR"

        return {
            "name": probe["name"],
            "status": status,
            "httpStatus": status_code,
            "errors": error_msgs[:300],
            "data": json.dumps(data)[:200] if data else None,
        }

    return {
        "name": probe["name"],
        "status": "OK",
        "httpStatus": status_code,
        "errors": None,
        "data": json.dumps(data)[:200] if data else None,
    }


def main():
    # Parse args
    token = os.environ.get("STAKE_TOKEN")
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg in ("--token", "-t") and i + 1 < len(args):
            token = args[i + 1]

    print("=" * 60)
    print("  Stake GraphQL Schema Probe")
    print("=" * 60)
    if token:
        print(f"  Token: {'*' * 8}{token[-4:]}")
    else:
        print("  Token: NONE (public queries only)")
    print()

    results = []
    for probe in PROBES:
        print(f"⏳ {probe['name']}...", end=" ", flush=True)
        result = send_probe(probe, token)
        results.append(result)

        icon = {
            "OK": "✅",
            "OK (business logic err)": "✅",
            "AUTH_REQUIRED": "⚠️",
            "SCHEMA_ERROR": "❌",
            "FETCH_ERROR": "💥",
        }.get(result["status"], "?")

        print(f"{icon} {result['status']}")
        if result["errors"]:
            print(f"   → {result['errors'][:150]}")
        if result["data"]:
            print(f"   → Data: {result['data'][:120]}")

    # Summary
    print()
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"{'Operation':<40} {'Status':<30}")
    print("-" * 70)
    for r in results:
        print(f"  {r['name']:<38} {r['status']}")
    print()

    # Save full results
    output_file = "stake-probe-results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"✓ Full results saved to {output_file}")

    # Count
    ok = sum(1 for r in results if "OK" in r["status"])
    schema_err = sum(1 for r in results if r["status"] == "SCHEMA_ERROR")
    auth = sum(1 for r in results if r["status"] == "AUTH_REQUIRED")
    print(f"  {ok} OK, {schema_err} schema errors, {auth} auth required")


if __name__ == "__main__":
    main()
