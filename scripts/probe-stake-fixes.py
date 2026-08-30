#!/usr/bin/env python3
"""
Follow-up probe: test the corrected field names suggested by Stake's error messages.
"""
import json
import urllib.request
import urllib.error

ENDPOINT = "https://stake.com/_api/graphql"
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

PROBES = [
    {
        "name": "5a. sportBetList (corrected from sportBetHistory)",
        "operationType": "query",
        "operationName": "StakeBetHistory",
        "query": """query StakeBetHistory($limit: Int!, $offset: Int!) {
            user {
                sportBetList(limit: $limit, offset: $offset) {
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
            }
        }""",
        "variables": {"limit": 5, "offset": 0},
    },
    {
        "name": "5b. sportBetList with status filter",
        "operationType": "query",
        "operationName": "StakeBetHistory",
        "query": """query StakeBetHistory($limit: Int!, $offset: Int!, $status: [SportBetStatusEnum!]) {
            user {
                sportBetList(limit: $limit, offset: $offset, status: $status) {
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
        "name": "6a. activeSportBetCount (corrected)",
        "operationType": "query",
        "operationName": "StakeActiveBetCount",
        "query": """query StakeActiveBetCount {
            user {
                activeSportBetCount
                activeBetsByType {
                    type
                    count
                }
            }
        }""",
        "variables": {},
    },
    {
        "name": "6b. activeSportBetCount only (no activeBetsByType)",
        "operationType": "query",
        "operationName": "StakeActiveBetCount",
        "query": """query StakeActiveBetCount {
            user {
                activeSportBetCount
            }
        }""",
        "variables": {},
    },
    {
        "name": "7a. SportBet market as object { name }",
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
                    market {
                        name
                    }
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
    {
        "name": "7b. SportBet minimal probe (outcome + market name only)",
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
                    market {
                        name
                    }
                    fixture {
                        name
                        slug
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


def send(probe):
    headers = {**BROWSER_HEADERS, "Content-Type": "application/json", "x-language": "en", "x-operation-type": probe["operationType"]}
    payload = json.dumps({"query": probe["query"], "variables": probe["variables"], "operationName": probe["operationName"]}).encode()
    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except:
            body = {"errors": [{"message": str(e)}]}
        return e.code, body
    except Exception as e:
        return None, {"errors": [{"message": str(e)}]}


print("=" * 60)
print("  Follow-up Probe: Corrected Field Names")
print("=" * 60)

for probe in PROBES:
    print(f"\n⏳ {probe['name']}...")
    status, body = send(probe)
    errors = body.get("errors", [])
    data = body.get("data")

    if errors:
        msgs = "; ".join(e.get("message", "?") for e in errors)
        is_schema = any(kw in msgs for kw in ["Cannot query field", "Unknown field", "must have a selection"])
        print(f"  {'❌ SCHEMA' if is_schema else '⚠️  LOGIC'} (HTTP {status}): {msgs[:200]}")
    else:
        print(f"  ✅ OK (HTTP {status})")
        if data:
            print(f"  Data: {json.dumps(data)[:200]}")

print("\n" + "=" * 60)
