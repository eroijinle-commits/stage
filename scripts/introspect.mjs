/**
 * Standalone Stake GraphQL introspection script.
 *
 * Usage (Node.js with token):
 *   STAKE_API_TOKEN="your-token" node scripts/introspect.mjs
 *
 * Or paste the browser version below into the browser console on stake.com.
 * Outputs: stake-schema.json (full) + printed summary to stdout.
 *
 * @module scripts/introspect
 */

const ENDPOINT = "https://stake.com/_api/graphql";

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name kind description
      fields {
        name description
        args { name description type { name kind ofType { name kind } } }
        type { name kind ofType { name kind } }
      }
      inputFields { name type { name kind ofType { name kind } } }
      enumValues { name description }
    }
    directives { name description locations args { name type { name kind ofType { name kind } } } }
  }
}
`;

// ── Helpers ──────────────────────────────────────────────────────────────

function fmtType(t) {
  if (!t) return "?";
  if (t.name) return t.name;
  if (t.ofType) {
    const inner = fmtType(t.ofType);
    if (t.kind === "NON_NULL") return inner + "!";
    if (t.kind === "LIST") return "[" + inner + "]";
  }
  return t.kind || "?";
}

function printSummary(schema) {
  const line = "═".repeat(60);
  console.log("\n" + line);
  console.log("  Stake GraphQL API — Full Schema");
  console.log(line + "\n");

  // Queries
  const queries = schema.queryType?.fields || [];
  console.log(`── Queries (${queries.length}) ──\n`);
  for (const f of queries) {
    const args =
      f.args.length > 0
        ? "(" + f.args.map((a) => `${a.name}: ${fmtType(a.type)}`).join(", ") + ")"
        : "";
    console.log(`  ${f.name}${args} → ${fmtType(f.type)}`);
    if (f.description) console.log(`    ${f.description}`);
  }

  // Mutations
  const mutations = schema.mutationType?.fields || [];
  if (mutations.length > 0) {
    console.log(`\n── Mutations (${mutations.length}) ──\n`);
    for (const f of mutations) {
      const args =
        f.args.length > 0
          ? "(" + f.args.map((a) => `${a.name}: ${fmtType(a.type)}`).join(", ") + ")"
          : "";
      console.log(`  ${f.name}${args} → ${fmtType(f.type)}`);
    }
  }

  // Key types (fixture/market/sport/group/template/outcome related)
  const keyTypes = schema.types.filter(
    (t) =>
      t.kind === "OBJECT" &&
      t.fields &&
      t.name &&
      !t.name.startsWith("__") &&
      /fixture|market|sport|group|template|outcome|bet/i.test(t.name),
  );
  if (keyTypes.length > 0) {
    console.log(`\n── Key Types (${keyTypes.length}) ──\n`);
    for (const t of keyTypes) {
      console.log(`  ${t.name} {`);
      for (const f of t.fields || []) {
        console.log(`    ${f.name}: ${fmtType(f.type)}`);
      }
      console.log("  }\n");
    }
  }

  // All object types (for reference)
  const allObjects = schema.types.filter(
    (t) => t.kind === "OBJECT" && t.name && !t.name.startsWith("__"),
  );
  console.log(`\n── All Object Types (${allObjects.length}) ──\n`);
  for (const t of allObjects) {
    const fieldCount = t.fields?.length || 0;
    console.log(`  ${t.name} (${fieldCount} fields)`);
  }

  console.log("\n" + line);
}

// ── Browser version (paste into console) ─────────────────────────────────
// Copy everything inside this function into the browser console:
function browserIntrospect() {
  var token = localStorage.getItem("stake-api-token");
  var headers = { "Content-Type": "application/json", "x-language": "en" };
  if (token) headers["x-access-token"] = token;

  return fetch("https://stake.com/_api/graphql", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ query: INTROSPECTION_QUERY, operationName: "IntrospectionQuery" }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (body) {
      if (body.errors) {
        console.error("Introspection blocked:", body.errors[0].message);
        return null;
      }
      var schema = body.data.__schema;

      // Print summary
      console.log("\n" + "═".repeat(60));
      console.log("  Stake GraphQL API — Full Schema");
      console.log("═".repeat(60) + "\n");

      var queries = schema.queryType.fields || [];
      console.log("-- Queries (" + queries.length + ") --\n");
      for (var i = 0; i < queries.length; i++) {
        var f = queries[i];
        var args =
          f.args.length > 0
            ? "(" +
              f.args
                .map(function (a) {
                  return a.name + ": " + fmtType(a.type);
                })
                .join(", ") +
              ")"
            : "";
        console.log("  " + f.name + args + " → " + fmtType(f.type));
        if (f.description) console.log("    " + f.description);
      }

      if (schema.mutationType) {
        var muts = schema.mutationType.fields || [];
        console.log("\n-- Mutations (" + muts.length + ") --\n");
        for (var j = 0; j < muts.length; j++) {
          var mf = muts[j];
          var margs =
            mf.args.length > 0
              ? "(" +
                mf.args
                  .map(function (a) {
                    return a.name + ": " + fmtType(a.type);
                  })
                  .join(", ") +
                ")"
              : "";
          console.log("  " + mf.name + margs + " → " + fmtType(mf.type));
        }
      }

      var keyTypes = schema.types.filter(function (t) {
        return (
          t.kind === "OBJECT" &&
          t.fields &&
          t.name &&
          !t.name.startsWith("__") &&
          /fixture|market|sport|group|template|outcome|bet/i.test(t.name)
        );
      });
      if (keyTypes.length > 0) {
        console.log("\n-- Key Types (" + keyTypes.length + ") --\n");
        for (var k = 0; k < keyTypes.length; k++) {
          var t = keyTypes[k];
          console.log("  " + t.name + " {");
          if (t.fields) {
            for (var m = 0; m < t.fields.length; m++) {
              var ff = t.fields[m];
              console.log("    " + ff.name + ": " + fmtType(ff.type));
            }
          }
          console.log("  }\n");
        }
      }

      // All object types
      var allObjects = schema.types.filter(function (t) {
        return t.kind === "OBJECT" && t.name && !t.name.startsWith("__");
      });
      console.log("\n-- All Object Types (" + allObjects.length + ") --\n");
      for (var n = 0; n < allObjects.length; n++) {
        var ot = allObjects[n];
        console.log("  " + ot.name + " (" + (ot.fields ? ot.fields.length : 0) + " fields)");
      }

      console.log("\n" + "═".repeat(60));
      console.log("Full schema object:", schema);
      return schema;
    });
}

function fmtType(t) {
  if (!t) return "?";
  if (t.name) return t.name;
  if (t.ofType) {
    var inner = fmtType(t.ofType);
    if (t.kind === "NON_NULL") return inner + "!";
    if (t.kind === "LIST") return "[" + inner + "]";
  }
  return t.kind || "?";
}

// ── Node.js execution ────────────────────────────────────────────────────

async function main() {
  const token = process.env.STAKE_API_TOKEN || null;
  const headers = {
    "Content-Type": "application/json",
    "x-language": "en",
    "x-operation-name": "IntrospectionQuery",
    "x-operation-type": "query",
  };
  if (token) headers["x-access-token"] = token;

  console.log("Fetching Stake GraphQL schema via introspection...");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: INTROSPECTION_QUERY, operationName: "IntrospectionQuery" }),
  });

  const body = await res.json();
  if (body.errors) {
    console.error("Introspection error:", body.errors[0].message);
    process.exit(1);
  }

  const schema = body.data.__schema;
  printSummary(schema);

  // Save full schema
  const { writeFileSync } = await import("fs");
  writeFileSync("stake-schema.json", JSON.stringify(body.data, null, 2));
  console.log("\nFull schema saved to stake-schema.json");
}

if (typeof window === "undefined") {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
