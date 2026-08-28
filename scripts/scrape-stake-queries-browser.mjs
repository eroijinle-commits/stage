/**
 * Browser-based GraphQL query scraper for Stake.com.
 *
 * Usage:
 *   1. Open https://stake.com/sports in your browser
 *   2. Open DevTools Console
 *   3. Paste this entire script and press Enter
 *   4. Navigate around Stake (click fixtures, browse markets, switch sports)
 *   5. The script intercepts all GraphQL requests automatically
 *   6. When done, run: exportStakeQueries()
 *
 * This works because it runs in the browser context where bot protection doesn't apply.
 *
 * @module scripts/scrape-stake-queries-browser
 */

(function () {
    "use strict";

    var captured = [];
    var originalFetch = window.fetch;
    var originalXHR = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    // ── Intercept fetch() ──────────────────────────────────────────────
    window.fetch = function () {
        var url = arguments[0];
        var opts = arguments[1] || {};

        if (typeof url === "string" && url.includes("/graphql") && opts.method === "POST") {
            try {
                var body = typeof opts.body === "string" ? JSON.parse(opts.body) : null;
                if (body && (body.query || body.operationName)) {
                    captured.push({
                        timestamp: new Date().toISOString(),
                        operationName: body.operationName || null,
                        operationType: detectType(body.query),
                        query: body.query,
                        variables: body.variables || null,
                        headers: opts.headers || null,
                    });
                    console.log("[Scraper] Captured: " + (body.operationName || "anonymous") + " (" + detectType(body.query) + ")");
                }
            } catch (e) { }
        }

        return originalFetch.apply(this, arguments);
    };

    // ── Intercept XMLHttpRequest ───────────────────────────────────────
    XMLHttpRequest.prototype.open = function (method, url) {
        this._scrapeUrl = url;
        this._scrapeMethod = method;
        return originalXHR.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (this._scrapeUrl && this._scrapeUrl.includes("/graphql") && body) {
            try {
                var parsed = typeof body === "string" ? JSON.parse(body) : null;
                if (parsed && (parsed.query || parsed.operationName)) {
                    captured.push({
                        timestamp: new Date().toISOString(),
                        operationName: parsed.operationName || null,
                        operationType: detectType(parsed.query),
                        query: parsed.query,
                        variables: parsed.variables || null,
                    });
                    console.log("[Scraper] Captured (xhr): " + (parsed.operationName || "anonymous"));
                }
            } catch (e) { }
        }
        return originalSend.apply(this, arguments);
    };

    function detectType(query) {
        if (!query) return "unknown";
        var trimmed = query.trim();
        if (trimmed.indexOf("mutation") === 0) return "mutation";
        if (trimmed.indexOf("subscription") === 0) return "subscription";
        return "query";
    }

    // ── Export function ────────────────────────────────────────────────
    window.exportStakeQueries = function () {
        var unique = {};
        for (var i = 0; i < captured.length; i++) {
            var q = captured[i];
            var key = q.operationName || q.query.substring(0, 100);
            if (!unique[key]) unique[key] = q;
        }

        var results = [];
        var keys = Object.keys(unique);
        for (var j = 0; j < keys.length; j++) {
            var item = unique[keys[j]];
            var parsed = parseQuery(item.query);
            results.push({
                operationName: item.operationName,
                operationType: item.operationType,
                variables: parsed.variables,
                topLevelFields: parsed.fields,
                raw: item.query,
            });
        }

        // Print summary
        console.log("\n" + "═".repeat(60));
        console.log("  Captured " + results.length + " unique GraphQL operations");
        console.log("═".repeat(60) + "\n");

        for (var k = 0; k < results.length; k++) {
            var r = results[k];
            var varStr = r.variables.length > 0 ? "(" + r.variables.map(function (v) { return v.name + ": " + v.type }).join(", ") + ")" : "";
            console.log("  " + r.operationType + " " + r.operationName + varStr);
            console.log("    Fields: " + r.topLevelFields.join(", "));
        }

        // Copy to clipboard
        var json = JSON.stringify(results, null, 2);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(function () {
                console.log("\n✓ Copied to clipboard! Paste into a file or here.");
            });
        } else {
            console.log("\nCopy the variable 'window.__capturedStakeQueries' manually.");
        }
        window.__capturedStakeQueries = results;

        console.log("\nRaw captured count: " + captured.length);
        console.log("Unique operations: " + results.length);
        console.log("\nTo re-export: exportStakeQueries()");
        console.log("To see raw: console.table(captured)");

        return results;
    };

    function parseQuery(queryStr) {
        var variables = [];
        var fields = [];

        // Extract variables from (var1: Type!, var2: Type)
        var varMatch = queryStr.match(/\(([^)]+)\)/);
        if (varMatch) {
            var parts = varMatch[1].split(",");
            for (var i = 0; i < parts.length; i++) {
                var pieces = parts[i].split(":").map(function (s) { return s.trim() });
                if (pieces.length >= 2) {
                    variables.push({ name: pieces[0].replace("$", ""), type: pieces[1] });
                }
            }
        }

        // Extract top-level fields
        var braceIndex = queryStr.indexOf("{");
        if (braceIndex >= 0) {
            var body = queryStr.substring(braceIndex);
            var fieldRegex = /(\w+)\s*(?:[\({]|$)/gm;
            var m;
            while ((m = fieldRegex.exec(body)) !== null) {
                var name = m[1];
                if (["query", "mutation", "subscription", "on", "fragment", "if", "true", "false", "null", "undefined", "spread", "__typename"].indexOf(name) === -1) {
                    if (fields.indexOf(name) === -1) fields.push(name);
                }
            }
        }

        return { variables: variables, fields: fields };
    }

    // ── Also capture from performance entries (past requests) ──────────
    window.loadPastQueries = function () {
        var entries = performance.getEntriesByType("resource");
        var graphqlEntries = entries.filter(function (e) { return e.name.includes("/graphql"); });
        console.log("Found " + graphqlEntries.length + " past GraphQL requests in performance timeline.");
        console.log("(These only show URLs, not bodies. New requests will be captured with full query text.)");
        return graphqlEntries.map(function (e) { return e.name; });
    };

    console.log("═".repeat(60));
    console.log("  Stake GraphQL Scraper Active");
    console.log("═".repeat(60));
    console.log("  Intercepts: fetch() + XMLHttpRequest");
    console.log("  Navigate around Stake to capture queries.");
    console.log("  When done: exportStakeQueries()");
    console.log("═".repeat(60) + "\n");

})();
