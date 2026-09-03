// @ts-nocheck — browser console paste section uses loose typing intentionally
/**
 * GraphQL introspection utility for the Stake API.
 * Discovers all available queries, their arguments, and return types.
 *
 * Usage — paste this entire file into the browser console on Stage:
 *   (paste the code, then call: introspect())
 *
 * Or run the module version:
 *   npx tsx src/lib/stake-api/introspect.ts
 * @module lib/stake-api/introspect
 */

// ─── Browser console version (paste-friendly) ─────────────────────────────

/**
 * Run introspection from the browser console.
 * Just call: introspect()
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function introspect() {
  var token = localStorage.getItem("stake-api-token");
  var query =
    "query IntrospectionQuery { __schema { queryType { name fields { name description args { name description type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } mutationType { name fields { name args { name type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } types { name kind fields { name type { name kind ofType { name kind } } } } } }";

  var headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-language": "en",
    "x-operation-name": "IntrospectionQuery",
    "x-operation-type": "query",
  };
  if (token) headers["x-access-token"] = token;

  var res = await fetch("https://stake.com/_api/graphql", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ query: query }),
  });

  var body = await res.json();
  if (body.errors) {
    console.error("Introspection blocked:", body.errors[0].message);
    return;
  }

  var schema = body.data.__schema;
  console.log("\u2550".repeat(55));
  console.log("  Stake GraphQL API Schema");
  console.log("\u2550".repeat(55) + "\n");

  console.log("-- Queries (" + schema.queryType.fields.length + ") --\n");
  for (var i = 0; i < schema.queryType.fields.length; i++) {
    var f = schema.queryType.fields[i];
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
    console.log("  " + f.name + args + " \u2192 " + fmtType(f.type));
    if (f.description) console.log("    " + f.description);
  }

  if (schema.mutationType) {
    console.log("\n-- Mutations (" + schema.mutationType.fields.length + ") --\n");
    for (var j = 0; j < schema.mutationType.fields.length; j++) {
      var mf = schema.mutationType.fields[j];
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
      console.log("  " + mf.name + margs + " \u2192 " + fmtType(mf.type));
    }
  }

  var keyTypes = schema.types.filter(function (t) {
    return (
      t.kind === "OBJECT" &&
      t.fields &&
      t.name &&
      !t.name.startsWith("__") &&
      /fixture|market|sport|group|template|outcome/i.test(t.name)
    );
  });
  if (keyTypes.length > 0) {
    console.log("\n-- Key Types --\n");
    for (var k = 0; k < keyTypes.length; k++) {
      var t = keyTypes[k];
      console.log("  " + t.name + " {");
      if (t.fields) {
        for (var m = 0; m < t.fields.length; m++) {
          var ff = t.fields[m];
          console.log(
            "    " +
              ff.name +
              ": " +
              (ff.type.name || (ff.type.ofType && ff.type.ofType.name) || ff.type.kind),
          );
        }
      }
      console.log("  }\n");
    }
  }

  console.log("\u2550".repeat(55));
  console.log("Full schema:", body.data);
  return body.data;
}

function fmtType(t) {
  if (t.name) return t.name;
  if (t.ofType && t.ofType.name) {
    var prefix = t.kind === "NON_NULL" ? "!" : "";
    var suffix = t.kind === "LIST" ? "[]" : "";
    return prefix + t.ofType.name + suffix;
  }
  return t.kind;
}

// ─── Module version (for npx tsx) ─────────────────────────────────────────

import { executeQuery } from "./client";

interface IntrospectionField {
  name: string;
  description: string | null;
  args: Array<{
    name: string;
    description: string | null;
    type: {
      name: string | null;
      kind: string;
      ofType: { name: string | null; kind: string } | null;
    };
  }>;
  type: {
    name: string | null;
    kind: string;
    ofType: { name: string | null; kind: string } | null;
  };
}

interface IntrospectionResult {
  __schema: {
    queryType: { name: string; fields: IntrospectionField[] };
    mutationType: { name: string; fields: IntrospectionField[] } | null;
    types: Array<{
      name: string;
      kind: string;
      fields: Array<{
        name: string;
        type: { name: string | null; kind: string; ofType: { name: string | null } | null };
      }> | null;
    }>;
  };
}

function formatType(type: IntrospectionField["type"]): string {
  if (type.name) return type.name;
  if (type.ofType?.name)
    return `${type.kind === "NON_NULL" ? "!" : ""}${type.ofType.name}${type.kind === "LIST" ? "[]" : ""}`;
  return type.kind;
}

function formatArgType(type: IntrospectionField["args"][0]["type"]): string {
  if (type.name) return type.name;
  if (type.ofType?.name) {
    const inner = type.ofType.name;
    if (type.kind === "NON_NULL") return `${inner}!`;
    if (type.kind === "LIST") return `[${inner}]`;
    return inner;
  }
  return type.kind;
}

export async function introspectStakeAPI(): Promise<IntrospectionResult> {
  const query = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        types { name kind fields { name type { name kind ofType { name kind } } } }
        queryType {
          fields {
            name description
            args { name description type { name kind ofType { name kind } } }
            type { name kind ofType { name kind } }
          }
        }
      }
    }
  `;
  return executeQuery<IntrospectionResult>({
    query,
    operationName: "IntrospectionQuery",
    operationType: "query",
  });
}

export function printSchemaSummary(result: IntrospectionResult): void {
  const schema = result.__schema;
  console.log("═".repeat(55));
  console.log("  Stake GraphQL API Schema");
  console.log("═".repeat(55) + "\n");
  console.log(`── Queries (${schema.queryType.fields.length}) ──\n`);
  for (const f of schema.queryType.fields) {
    const args =
      f.args.length > 0
        ? `(${f.args.map((a) => `${a.name}: ${formatArgType(a.type)}`).join(", ")})`
        : "";
    console.log(`  ${f.name}${args} → ${formatType(f.type)}`);
    if (f.description) console.log(`    ${f.description}`);
  }
  if (schema.mutationType) {
    console.log(`\n── Mutations (${schema.mutationType.fields.length}) ──\n`);
    for (const f of schema.mutationType.fields) {
      const args =
        f.args.length > 0
          ? `(${f.args.map((a) => `${a.name}: ${formatArgType(a.type)}`).join(", ")})`
          : "";
      console.log(`  ${f.name}${args} → ${formatType(f.type)}`);
    }
  }
  const key = schema.types.filter(
    (t) =>
      t.kind === "OBJECT" &&
      t.fields &&
      t.name &&
      !t.name.startsWith("__") &&
      /fixture|market|sport|group|template|outcome/i.test(t.name),
  );
  if (key.length > 0) {
    console.log(`\n── Key Types ──\n`);
    for (const t of key) {
      console.log(`  ${t.name} {`);
      for (const f of t.fields || [])
        console.log(`    ${f.name}: ${f.type.name || f.type.ofType?.name || f.type.kind}`);
      console.log(`  }\n`);
    }
  }
  console.log("═".repeat(55));
}

if (typeof window === "undefined") {
  (async () => {
    try {
      const result = await introspectStakeAPI();
      printSchemaSummary(result);
      const { writeFileSync } = await import("fs");
      writeFileSync("stake-schema.json", JSON.stringify(result, null, 2));
      console.log("\nFull schema saved to stake-schema.json");
    } catch (err: any) {
      console.error("Introspection failed:", err.message);
      console.error("The Stake API may have introspection disabled.");
      process.exit(1);
    }
  })();
}
