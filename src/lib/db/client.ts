/**
 * Legacy client-side DB client.
 *
 * SECURITY: This module is no longer used by repositories — they call the
 * server API instead. Kept for backward compatibility and health checks.
 *
 * The database connection is now server-side only (see server/db.ts).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

/**
 * @deprecated Use the server API instead. This function exists only for
 * backward compatibility and should not be called from new code.
 */
export function getDb() {
    if (!_db) {
        throw new Error(
            "Direct database access from the client is no longer supported. " +
            "Use the server API (src/lib/api.ts) instead."
        );
    }
    return _db;
}

/**
 * Health check — calls the server API endpoint.
 * Returns true if the backend is alive.
 */
export async function checkConnection(): Promise<boolean> {
    try {
        const res = await fetch("/api/health");
        const data = await res.json();
        return data.ok === true;
    } catch {
        return false;
    }
}
