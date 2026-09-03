/**
 * Scraper that extracts GraphQL query definitions from Stake.com's frontend JS bundles.
 *
 * Stake blocks introspection, but their queries are embedded as string literals
 * in the JavaScript bundles. This script fetches the page, finds the JS files,
 * and extracts all GraphQL operation definitions.
 *
 * Usage:
 *   node scripts/scrape-stake-queries.mjs
 *
 * Output:
 *   stake-queries-raw.json   — all extracted query strings
 *   stake-queries-parsed.json — parsed with operation names, types, and variables
 *
 * @module scripts/scrape-stake-queries
 */

import { writeFileSync } from "fs";

const STAKE_URL = "https://stake.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ── Step 1: Fetch the main page and find JS bundle URLs ──────────────────

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function extractScriptUrls(html) {
  const urls = [];
  // Match <script src="..."> tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) src = STAKE_URL + src;
    urls.push(src);
  }
  return urls;
}

// ── Step 2: Extract GraphQL queries from JS source ───────────────────────

function extractGraphQLQueries(source) {
  const queries = [];

  // Pattern 1: template literals with query/mutation keywords
  // Matches: `query Name { ... }` or `mutation Name { ... }`
  const gqlRegex = /(?:query|mutation|subscription)\s+\w+(?:\s*\([^)]*\))?\s*\{[^`]*\}/g;
  let match;
  while ((match = gqlRegex.exec(source)) !== null) {
    queries.push(match[0]);
  }

  // Pattern 2: string literals containing GraphQL
  // Matches: "query Name { ... }" or 'query Name { ... }'
  const stringGqlRegex =
    /["'`](query|mutation|subscription)\s+\w+(?:\s*\([^)]*\))?\s*\{[^"'`]*\}["'`]/g;
  while ((match = stringGqlRegex.exec(source)) !== null) {
    // Remove surrounding quotes
    const q = match[0].slice(1, -1);
    if (!queries.includes(q)) queries.push(q);
  }

  // Pattern 3: gql tagged template literals
  // Matches: gql`query Name { ... }`
  const taggedRegex = /gql`((?:query|mutation|subscription)\s+\w+(?:\s*\([^)]*\))?\s*\{[^`]*\})`/g;
  while ((match = taggedRegex.exec(source)) !== null) {
    if (!queries.includes(match[1])) queries.push(match[1]);
  }

  // Pattern 4: graphql-tag style
  const gqlTagRegex = /gql\(`((?:query|mutation|subscription)[\s\S]*?)`\)/g;
  while ((match = gqlTagRegex.exec(source)) !== null) {
    const q = match[1].trim();
    if (!queries.includes(q)) queries.push(q);
  }

  return queries;
}

function parseQuery(queryStr) {
  const typeMatch = queryStr.match(/^(query|mutation|subscription)\s+(\w+)/);
  const operationType = typeMatch ? typeMatch[1] : "unknown";
  const operationName = typeMatch ? typeMatch[2] : "anonymous";

  // Extract variable definitions
  const varMatch = queryStr.match(/\(([^)]*)\)/);
  const variables = [];
  if (varMatch) {
    const varParts = varMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of varParts) {
      const [name, type] = part.split(":").map((s) => s.trim());
      if (name && type) variables.push({ name: name.replace("$", ""), type });
    }
  }

  // Extract top-level field names from the selection set
  const fields = [];
  const fieldRegex = /(\w+)\s*(?:\(|\{|$)/gm;
  let bodyStart = queryStr.indexOf("{");
  if (bodyStart >= 0) {
    const body = queryStr.slice(bodyStart);
    const innerFieldRegex = /(\w+)\s*(?:\(|\{)/g;
    let fm;
    while ((fm = innerFieldRegex.exec(body)) !== null) {
      if (!["query", "mutation", "subscription", "on", "fragment", "spread"].includes(fm[1])) {
        fields.push(fm[1]);
      }
    }
  }

  return { operationType, operationName, variables, fields, raw: queryStr };
}

// ── Step 3: Also try to find query strings from network-style patterns ────

function extractOperationNames(source) {
  const names = new Set();
  // x-operation-name headers
  const opNameRegex = /["']x-operation-name["']\s*[,:]\s*["'](\w+)["']/g;
  let m;
  while ((m = opNameRegex.exec(source)) !== null) names.add(m[1]);
  // Also look for operationName in JSON payloads
  const opJsonRegex = /operationName["']\s*:\s*["'](\w+)["']/g;
  while ((m = opJsonRegex.exec(source)) !== null) names.add(m[1]);
  return [...names];
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  Stake.com GraphQL Query Scraper");
  console.log("═".repeat(60) + "\n");

  // Step 1: Fetch main page
  console.log("1. Fetching stake.com...");
  const html = await fetchPage(STAKE_URL);
  console.log(`   Got ${html.length} bytes of HTML`);

  // Step 2: Find JS bundles
  const scriptUrls = extractScriptUrls(html);
  console.log(`2. Found ${scriptUrls.length} script URLs`);

  // Step 3: Fetch each JS bundle and extract queries
  const allQueries = new Set();
  const allOperationNames = new Set();
  const sources = {};

  for (const url of scriptUrls) {
    try {
      process.stdout.write(`   Fetching ${url.split("/").pop()}...`);
      const source = await fetchPage(url);
      const queries = extractGraphQLQueries(source);
      const opNames = extractOperationNames(source);

      if (queries.length > 0 || opNames.length > 0) {
        console.log(` ✓ ${queries.length} queries, ${opNames.length} operation names`);
        queries.forEach((q) => allQueries.add(q));
        opNames.forEach((n) => allOperationNames.add(n));
        sources[url] = { queryCount: queries.length, operationNames: opNames };
      } else {
        console.log(" (no queries found)");
      }
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }
  }

  // Step 4: Also try common asset paths that might contain the main bundle
  const extraPaths = [
    "/assets/index.js",
    "/assets/app.js",
    "/assets/main.js",
    "/_next/static/",
    "/static/js/",
    "/build/",
    "/dist/",
  ];
  // Try to find more bundles from the HTML inline scripts
  const inlineScriptRegex = /["'](\/[^"']+\.(?:js|mjs))["']/g;
  let im;
  while ((im = inlineScriptRegex.exec(html)) !== null) {
    const path = im[1];
    if (!scriptUrls.some((u) => u.endsWith(path))) {
      const fullUrl = STAKE_URL + path;
      try {
        process.stdout.write(`   Fetching extra ${path.split("/").pop()}...`);
        const source = await fetchPage(fullUrl);
        const queries = extractGraphQLQueries(source);
        const opNames = extractOperationNames(source);
        if (queries.length > 0 || opNames.length > 0) {
          console.log(` ✓ ${queries.length} queries, ${opNames.length} operation names`);
          queries.forEach((q) => allQueries.add(q));
          opNames.forEach((n) => allOperationNames.add(n));
        } else {
          console.log(" (no queries found)");
        }
      } catch {
        console.log(" (failed)");
      }
    }
  }

  // Step 5: Parse and output
  console.log(`\n3. Found ${allQueries.size} unique GraphQL queries`);
  console.log(`   Found ${allOperationNames.size} operation names\n`);

  const parsed = [...allQueries].map(parseQuery);

  // Print summary
  console.log("── Queries by Type ──\n");
  const byType = {};
  for (const q of parsed) {
    if (!byType[q.operationType]) byType[q.operationType] = [];
    byType[q.operationType].push(q);
  }
  for (const [type, queries] of Object.entries(byType)) {
    console.log(`  ${type} (${queries.length}):`);
    for (const q of queries) {
      const vars =
        q.variables.length > 0
          ? `(${q.variables.map((v) => `${v.name}: ${v.type}`).join(", ")})`
          : "";
      console.log(`    ${q.operationName}${vars}`);
    }
  }

  // All known operation names (from headers too)
  const allNames = new Set([...parsed.map((q) => q.operationName), ...allOperationNames]);
  console.log(`\n── All Known Operation Names (${allNames.size}) ──\n`);
  for (const name of [...allNames].sort()) {
    console.log(`  ${name}`);
  }

  // Save files
  writeFileSync("stake-queries-raw.json", JSON.stringify([...allQueries], null, 2));
  writeFileSync("stake-queries-parsed.json", JSON.stringify(parsed, null, 2));
  console.log("\n── Saved ──");
  console.log("  stake-queries-raw.json    — raw query strings");
  console.log("  stake-queries-parsed.json — parsed with names, types, variables");
  console.log("\n" + "═".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
