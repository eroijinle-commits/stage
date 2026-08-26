import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get or create the Drizzle ORM instance (server-side).
 * Reads DATABASE_URL from process.env — never exposed to the client.
 */
export function getServerDb() {
    if (!_db) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error(
                "Missing DATABASE_URL environment variable. " +
                "Set it in your .env file (server-side only, no VITE_ prefix)."
            );
        }
        const sql = neon(databaseUrl);
        _db = drizzle(sql, { schema });
    }
    return _db;
}
