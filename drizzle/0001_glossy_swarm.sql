CREATE TABLE "error_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"source" text NOT NULL,
	"capture_method" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"url" text,
	"user_agent" text,
	"metadata" text,
	"created_at" integer NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL
);
