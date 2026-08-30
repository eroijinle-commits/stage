#!/usr/bin/env python3
"""Deep probe: discover exact fields on Bet, BetOutcome, and activeBetsBalances types."""
import json
import urllib.request
import urllib.error

ENDPOINT = "https://stake.com/_api/graphql"
HEADERS = {
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
    "Content-Type": "application/json",
    "x-language": "en",
}

def send(query, variables=None, op_type="query"):
    h = {**HEADERS, "x-operation-type": op_type}
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(ENDPOINT, data=payload, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except:
            body = {"errors": [{"message": str(e)}]}
        return e.code, body
    except Exception as e:
        return None, {"errors": [{"message": str(e)}]}

print("=" * 60)
print("  Deep Schema Probe")
print("=" * 60)

# ── Probe 5c: Discover Bet fields by trying common names ────────────────
print("\n── Bet type fields ──\n")

bet_field_attempts = [
    "id", "amount", "currency", "status", "betType", "type",
    "payoutMultiplier", "potentialMultiplier", "totalOdds", "stakePerLeg",
    "createdAt", "settledAt", "odds", "payout", "profit",
    "sportBetType", "maxPayout", "totalAmount", "stake",
    "settled", "bonus", "freeBet", "cashout",
]

# Test each field individually
working_fields = []
for field in bet_field_attempts:
    q = f"""query {{ user {{ sportBetList(limit: 1, offset: 0) {{ {field} }} }} }}"""
    status, body = send(q)
    errors = body.get("errors", [])
    if not errors:
        working_fields.append(field)
        print(f"  ✅ {field}")
    else:
        msg = errors[0].get("message", "")
        if "Cannot query field" in msg:
            # Extract suggestion
            did_you_mean = ""
            if "Did you mean" in msg:
                did_you_mean = msg.split("Did you mean")[1].rstrip(".")
            print(f"  ❌ {field} → {did_you_mean}")
        else:
            print(f"  ⚠️  {field} → {msg[:100]}")

print(f"\n  Working Bet fields: {working_fields}")

# ── Probe 5d: BetOutcome fields ─────────────────────────────────────────
print("\n── BetOutcome fields (inside sportBetList.outcomes) ──\n")

outcome_fields = [
    "id", "name", "odds", "market", "fixture", "result", "status",
    "active", "extId", "outcomeName", "marketName", "fixtureName",
    "selectionName", "betOutcomeId", "sportOutcomeId",
]

# Use a working query and add outcome subfields
for field in outcome_fields:
    q = f"""query {{ user {{ sportBetList(limit: 1, offset: 0) {{ outcomes {{ {field} }} }} }} }}"""
    status, body = send(q)
    errors = body.get("errors", [])
    if not errors:
        print(f"  ✅ {field}")
    else:
        msg = errors[0].get("message", "")
        if "Did you mean" in msg:
            print(f"  ❌ {field} → {msg.split('Did you mean')[1].rstrip('.')}")
        elif "requires a selection" in msg or "must have a selection" in msg:
            print(f"  🔲 {field} (object — needs subfields)")
        else:
            print(f"  ❌ {field} → {msg[:100]}")

# ── Probe 6c: activeBetsBalances structure ──────────────────────────────
print("\n── activeBetsBalances fields ──\n")

ab_fields = ["amount", "currency", "count", "type", "betType", "sport", "name"]
for field in ab_fields:
    q = f"""query {{ user {{ activeBetsBalances {{ {field} }} }} }}"""
    status, body = send(q)
    errors = body.get("errors", [])
    if not errors:
        print(f"  ✅ {field}")
    else:
        msg = errors[0].get("message", "")
        if "Did you mean" in msg:
            print(f"  ❌ {field} → {msg.split('Did you mean')[1].rstrip('.')}")
        elif "requires a selection" in msg or "must have a selection" in msg:
            print(f"  🔲 {field} (object — needs subfields)")
        else:
            print(f"  ❌ {field} → {msg[:100]}")

# ── Probe 7c: SportBet mutation — test with lowercase currency ──────────
print("\n── SportBet mutation (lowercase currency) ──\n")

q7 = """mutation SportBetSlip(
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
}"""

status, body = send(q7, {
    "outcomeIds": ["probe-test-000"],
    "amount": 0.01,
    "currency": "ngn",
    "betType": "sports",
    "oddsChange": "higher",
    "stakeShieldEnabled": False,
}, op_type="mutation")

errors = body.get("errors", [])
if errors:
    msgs = "; ".join(e.get("message", "?") for e in errors)
    is_schema = any(kw in msgs for kw in ["Cannot query field", "Unknown field", "must have a selection", "does not exist in"])
    print(f"  {'❌ SCHEMA' if is_schema else '⚠️  LOGIC'} (HTTP {status}): {msgs[:300]}")
else:
    print(f"  ✅ Query structure valid (HTTP {status})")
    data = body.get("data")
    if data:
        print(f"  Data: {json.dumps(data)[:200]}")

print("\n" + "=" * 60)
