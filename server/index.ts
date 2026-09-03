import express from "express";
import cors from "cors";
import path from "node:path";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { getServerDb } from "./db";
import * as schema from "../src/lib/db/schema";
import { encryptToken, decryptToken, isEncrypted } from "./crypto";
import { sendErrorToDiscord } from "./discord-webhook";
import type { ErrorReportPayload, ErrorReportResponse } from "../src/lib/contracts/error.contract";

const app = express();
const PORT = process.env.PORT ?? 3001;

const rawOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawOrigin.split(",").map((o: string) => o.trim());

// In production, also allow the Render URL if CORS_ORIGIN is set
const renderUrl = process.env.RENDER_EXTERNAL_URL;
if (renderUrl && !allowedOrigins.includes(renderUrl)) {
  allowedOrigins.push(renderUrl);
}

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: false,
  }),
);
app.use(express.json());

// ─── Static files (production) ───
const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API GET routes
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    next();
    return;
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Proxy Stake GraphQL to avoid CORS in the browser ───
app.use("/api/graphql", async (req, res) => {
  const targetUrl = "https://stake.com/_api/graphql";
  const body = req.body && typeof req.body === "object" ? JSON.stringify(req.body) : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-language": (req.headers["x-language"] as string) ?? "en",
    "x-operation-name": (req.headers["x-operation-name"] as string) ?? "",
    "x-operation-type": (req.headers["x-operation-type"] as string) ?? "",
  };

  if (req.headers["x-access-token"]) {
    headers["x-access-token"] = req.headers["x-access-token"] as string;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.send(responseBody);
  } catch (err) {
    res
      .status(502)
      .json({ error: "Proxy error", message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Health ───

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ─── Error Reporting ───

app.post("/api/errors/report", async (req, res) => {
  const payload = req.body as ErrorReportPayload;

  // Basic validation — reject empty or malformed payloads
  if (!payload || typeof payload.message !== "string" || !payload.message) {
    res.status(400).json({ ok: false, reason: "disabled" } satisfies ErrorReportResponse);
    return;
  }

  // Ensure source is set correctly for frontend reports
  if (!payload.source) payload.source = "frontend";

  const result = await sendErrorToDiscord(payload);
  res.json({ ok: result !== "disabled", reason: result } satisfies ErrorReportResponse);
});

// ─── Settings ───

app.get("/api/settings/:key", async (req, res) => {
  const db = getServerDb();
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, req.params.key))
    .limit(1);
  const value = rows.length > 0 ? rows[0].value : null;
  // Decrypt apiToken on read
  const key = req.params.key;
  const decrypted = key === "apiToken" && value ? decryptToken(value) : value;
  res.json({ value: decrypted });
});

app.put("/api/settings/:key", async (req, res) => {
  const db = getServerDb();
  const key = req.params.key;
  let { value } = req.body as { value: string };
  // Encrypt apiToken before storing
  if (key === "apiToken" && value && !isEncrypted(value)) {
    value = encryptToken(value);
  }
  await db
    .insert(schema.settings)
    .values({ key, value, updatedAt: Math.floor(Date.now() / 1000) })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value, updatedAt: Math.floor(Date.now() / 1000) },
    });
  res.json({ ok: true });
});

app.get("/api/settings", async (_req, res) => {
  const db = getServerDb();
  const rows = await db.select().from(schema.settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    // Decrypt apiToken on read
    result[row.key] = row.key === "apiToken" ? decryptToken(row.value) : row.value;
  }
  res.json(result);
});

// ─── App State ───

app.get("/api/app-state/:key", async (req, res) => {
  const db = getServerDb();
  const rows = await db
    .select()
    .from(schema.appState)
    .where(eq(schema.appState.key, req.params.key))
    .limit(1);
  res.json({ value: rows.length > 0 ? rows[0].value : null });
});

app.put("/api/app-state/:key", async (req, res) => {
  const db = getServerDb();
  const { value } = req.body as { value: string };
  await db
    .insert(schema.appState)
    .values({ key: req.params.key, value, updatedAt: Math.floor(Date.now() / 1000) })
    .onConflictDoUpdate({
      target: schema.appState.key,
      set: { value, updatedAt: Math.floor(Date.now() / 1000) },
    });
  res.json({ ok: true });
});

// ─── Bets ───

app.get("/api/bets", async (req, res) => {
  const db = getServerDb();
  const { limit = "50", offset = "0", status, dateFrom, dateTo } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(schema.bets.status, status as string));
  if (dateFrom) conditions.push(gte(schema.bets.createdAt, Number(dateFrom)));
  if (dateTo) conditions.push(lte(schema.bets.createdAt, Number(dateTo)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.bets)
    .where(where)
    .orderBy(desc(schema.bets.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  res.json(rows);
});

app.post("/api/bets", async (req, res) => {
  const db = getServerDb();
  const bet = req.body;
  await db.insert(schema.bets).values({
    id: bet.id,
    amount: String(bet.amount),
    currency: bet.currency,
    status: bet.status,
    betType: bet.betType,
    payoutMultiplier: bet.payoutMultiplier != null ? String(bet.payoutMultiplier) : null,
    potentialMultiplier: String(bet.potentialMultiplier),
    totalOdds: String(bet.totalOdds),
    stakePerLeg: bet.stakePerLeg != null ? String(bet.stakePerLeg) : null,
    createdAt: bet.createdAt,
    settledAt: bet.settledAt,
    rawData: bet.rawData,
  });
  res.json({ ok: true });
});

app.get("/api/bets/stats", async (_req, res) => {
  const db = getServerDb();
  const result = await db.execute(/* sql */ `
        SELECT
            COUNT(*)::int AS total_bets,
            COALESCE(SUM(CASE WHEN status != 'pending' THEN amount::numeric ELSE 0 END), 0)::numeric AS total_wagered,
            COALESCE(SUM(CASE WHEN status = 'won' THEN (amount::numeric * payout_multiplier::numeric) ELSE 0 END), 0)::numeric AS total_returned,
            CASE WHEN COUNT(*) FILTER (WHERE status != 'pending') > 0
                THEN (COUNT(*) FILTER (WHERE status = 'won')::numeric / COUNT(*) FILTER (WHERE status != 'pending')::numeric * 100)
                ELSE 0
            END AS win_rate,
            COALESCE(AVG(CASE WHEN status != 'pending' THEN total_odds::numeric END), 0)::numeric AS avg_odds
        FROM bets
    `);
  const row = (result as unknown as Array<Record<string, unknown>>)[0];
  res.json({
    totalBets: Number(row?.total_bets ?? 0),
    totalWagered: Number(row?.total_wagered ?? 0),
    totalReturned: Number(row?.total_returned ?? 0),
    winRate: Number(row?.win_rate ?? 0),
    avgOdds: Number(row?.avg_odds ?? 0),
  });
});

app.get("/api/bets/count", async (_req, res) => {
  const db = getServerDb();
  const result = await db.execute(/* sql */ `SELECT COUNT(*)::int AS count FROM bets`);
  const row = (result as unknown as Array<Record<string, unknown>>)[0];
  res.json({ count: Number(row?.count ?? 0) });
});

app.get("/api/bets/:id", async (req, res) => {
  const db = getServerDb();
  const rows = await db
    .select()
    .from(schema.bets)
    .where(eq(schema.bets.id, req.params.id))
    .limit(1);
  res.json(rows.length > 0 ? rows[0] : null);
});

app.put("/api/bets/:id/status", async (req, res) => {
  const db = getServerDb();
  const { status, payoutMultiplier } = req.body as { status: string; payoutMultiplier?: number };
  const updates: Record<string, unknown> = { status };
  if (payoutMultiplier != null) {
    updates.payoutMultiplier = String(payoutMultiplier);
  }
  if (status === "won" || status === "lost" || status === "settled" || status === "cashout") {
    updates.settledAt = Math.floor(Date.now() / 1000);
  }
  await db.update(schema.bets).set(updates).where(eq(schema.bets.id, req.params.id));
  res.json({ ok: true });
});

app.delete("/api/bets/:id", async (req, res) => {
  const db = getServerDb();
  await db.delete(schema.bets).where(eq(schema.bets.id, req.params.id));
  res.json({ ok: true });
});

// ─── Outcomes ───

app.get("/api/outcomes/bet/:betId", async (req, res) => {
  const db = getServerDb();
  const rows = await db
    .select()
    .from(schema.betOutcomes)
    .where(eq(schema.betOutcomes.betId, req.params.betId));
  res.json(rows);
});

app.post("/api/outcomes", async (req, res) => {
  const db = getServerDb();
  const outcome = req.body;
  await db.insert(schema.betOutcomes).values({
    id: outcome.id,
    betId: outcome.betId,
    outcomeId: outcome.outcomeId,
    odds: String(outcome.odds),
    name: outcome.name,
    marketName: outcome.marketName,
    fixtureName: outcome.fixtureName,
    fixtureSlug: outcome.fixtureSlug,
    status: outcome.status,
    result: outcome.result,
  });
  res.json({ ok: true });
});

app.put("/api/outcomes/:id", async (req, res) => {
  const db = getServerDb();
  const { status, result } = req.body as { status: string; result?: string };
  await db
    .update(schema.betOutcomes)
    .set({ status, ...(result != null ? { result } : {}) })
    .where(eq(schema.betOutcomes.id, req.params.id));
  res.json({ ok: true });
});

// ─── Filters ───

app.get("/api/filters", async (_req, res) => {
  const db = getServerDb();
  const rows = await db.select().from(schema.savedFilters);
  res.json(rows);
});

app.post("/api/filters", async (req, res) => {
  const db = getServerDb();
  const filter = req.body;
  const rows = await db
    .insert(schema.savedFilters)
    .values({
      name: filter.name,
      sport: filter.sport,
      group: filter.group,
      tournamentSlugs: filter.tournamentSlugs,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      marketTemplate: filter.marketTemplate,
      createdAt: filter.createdAt,
    })
    .returning({ id: schema.savedFilters.id });
  res.json({ id: rows[0].id });
});

app.delete("/api/filters/:id", async (req, res) => {
  const db = getServerDb();
  await db.delete(schema.savedFilters).where(eq(schema.savedFilters.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── Presets ───

app.get("/api/presets", async (_req, res) => {
  const db = getServerDb();
  const rows = await db.select().from(schema.stakingPresets);
  res.json(rows);
});

app.post("/api/presets", async (req, res) => {
  const db = getServerDb();
  const preset = req.body;
  const rows = await db
    .insert(schema.stakingPresets)
    .values({
      name: preset.name,
      mode: preset.mode,
      amount: preset.amount != null ? String(preset.amount) : null,
      percentage: preset.percentage != null ? String(preset.percentage) : null,
      unitSize: preset.unitSize != null ? String(preset.unitSize) : null,
      bankroll: preset.bankroll != null ? String(preset.bankroll) : null,
      isDefault: preset.isDefault,
    })
    .returning({ id: schema.stakingPresets.id });
  res.json({ id: rows[0].id });
});

app.put("/api/presets/:id", async (req, res) => {
  const db = getServerDb();
  const preset = req.body;
  const updates: Record<string, unknown> = {};
  if (preset.name !== undefined) updates.name = preset.name;
  if (preset.mode !== undefined) updates.mode = preset.mode;
  if (preset.amount !== undefined)
    updates.amount = preset.amount != null ? String(preset.amount) : null;
  if (preset.percentage !== undefined)
    updates.percentage = preset.percentage != null ? String(preset.percentage) : null;
  if (preset.unitSize !== undefined)
    updates.unitSize = preset.unitSize != null ? String(preset.unitSize) : null;
  if (preset.bankroll !== undefined)
    updates.bankroll = preset.bankroll != null ? String(preset.bankroll) : null;
  if (preset.isDefault !== undefined) updates.isDefault = preset.isDefault;
  await db
    .update(schema.stakingPresets)
    .set(updates)
    .where(eq(schema.stakingPresets.id, Number(req.params.id)));
  res.json({ ok: true });
});

app.delete("/api/presets/:id", async (req, res) => {
  const db = getServerDb();
  await db.delete(schema.stakingPresets).where(eq(schema.stakingPresets.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── Express Error Middleware ───
// Catches unhandled errors in server-side route handlers,
// reports them to Discord, and returns a 500 response.

app.use(
  async (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[server] Unhandled error:", err);

    // Report to Discord (fire-and-forget, don't block the response)
    sendErrorToDiscord({
      message: err.message,
      stack: err.stack,
      source: "backend",
      captureMethod: "expressMiddleware",
      severity: "error",
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  },
);

// ─── Start ───

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
