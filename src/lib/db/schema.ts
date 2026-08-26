import { pgTable, serial, text, numeric, integer, boolean } from "drizzle-orm/pg-core";

// ─── Bets ───

export const bets = pgTable("bets", {
    id: text("id").primaryKey(),
    amount: numeric("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    betType: text("bet_type").notNull(),
    payoutMultiplier: numeric("payout_multiplier"),
    potentialMultiplier: numeric("potential_multiplier").notNull(),
    totalOdds: numeric("total_odds").notNull(),
    stakePerLeg: numeric("stake_per_leg"),
    createdAt: integer("created_at").notNull(),
    settledAt: integer("settled_at"),
    rawData: text("raw_data").notNull(),
});

// ─── Bet Outcomes ───

export const betOutcomes = pgTable("bet_outcomes", {
    id: text("id").primaryKey(),
    betId: text("bet_id")
        .notNull()
        .references(() => bets.id, { onDelete: "cascade" }),
    outcomeId: text("outcome_id").notNull(),
    odds: numeric("odds").notNull(),
    name: text("name").notNull(),
    marketName: text("market_name").notNull(),
    fixtureName: text("fixture_name").notNull(),
    fixtureSlug: text("fixture_slug").notNull(),
    status: text("status").notNull(),
    result: text("result"),
});

// ─── Saved Filters ───

export const savedFilters = pgTable("saved_filters", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sport: text("sport"),
    group: text("group"),
    tournamentSlugs: text("tournament_slugs").notNull().default("[]"),
    dateFrom: integer("date_from"),
    dateTo: integer("date_to"),
    marketTemplate: text("market_template"),
    createdAt: integer("created_at").notNull(),
});

// ─── Staking Presets ───

export const stakingPresets = pgTable("staking_presets", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    mode: text("mode").notNull(),
    amount: numeric("amount"),
    percentage: numeric("percentage"),
    unitSize: numeric("unit_size"),
    bankroll: numeric("bankroll"),
    isDefault: boolean("is_default").notNull().default(false),
});

// ─── Settings ───

export const settings = pgTable("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

// ─── App State ───

export const appState = pgTable("app_state", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at").notNull(),
});
