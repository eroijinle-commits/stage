import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Seed script — populates the database with default data.
 * Run via: pnpm db:seed
 * Requires DATABASE_URL environment variable (server-side only).
 */
async function seed() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("Missing DATABASE_URL environment variable.");
        process.exit(1);
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql, { schema });

    console.log("Seeding database...");

    // Default staking preset: "Flat ₦100"
    const existingPresets = await db.select().from(schema.stakingPresets);
    if (existingPresets.length === 0) {
        await db.insert(schema.stakingPresets).values({
            name: "Flat ₦100",
            mode: "flat",
            amount: "100",
            isDefault: true,
        });
        console.log("  ✓ Created default staking preset: Flat ₦100");
    } else {
        console.log("  - Staking presets already exist, skipping");
    }

    // Default settings
    const now = Math.floor(Date.now() / 1000);
    const defaultSettings: Array<{ key: string; value: string }> = [
        { key: "currency", value: JSON.stringify("NGN") },
        { key: "oddsFormat", value: JSON.stringify("decimal") },
        { key: "theme", value: JSON.stringify("dark") },
        { key: "notifications", value: JSON.stringify({ betPlaced: true, betSettled: true, oddsChanged: false }) },
    ];

    for (const setting of defaultSettings) {
        const existing = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, setting.key))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(schema.settings).values({
                key: setting.key,
                value: setting.value,
                updatedAt: now,
            });
            console.log(`  ✓ Created setting: ${setting.key}`);
        } else {
            console.log(`  - Setting "${setting.key}" already exists, skipping`);
        }
    }

    console.log("Seed complete.");
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
