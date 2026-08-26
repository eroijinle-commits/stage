CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bet_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"bet_id" text NOT NULL,
	"outcome_id" text NOT NULL,
	"odds" numeric NOT NULL,
	"name" text NOT NULL,
	"market_name" text NOT NULL,
	"fixture_name" text NOT NULL,
	"fixture_slug" text NOT NULL,
	"status" text NOT NULL,
	"result" text
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"bet_type" text NOT NULL,
	"payout_multiplier" numeric,
	"potential_multiplier" numeric NOT NULL,
	"total_odds" numeric NOT NULL,
	"stake_per_leg" numeric,
	"created_at" integer NOT NULL,
	"settled_at" integer,
	"raw_data" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport" text,
	"group" text,
	"tournament_slugs" text DEFAULT '[]' NOT NULL,
	"date_from" integer,
	"date_to" integer,
	"market_template" text,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staking_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"amount" numeric,
	"percentage" numeric,
	"unit_size" numeric,
	"bankroll" numeric,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bet_outcomes" ADD CONSTRAINT "bet_outcomes_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;