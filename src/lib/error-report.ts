/**
 * Frontend error reporting — captures errors and sends them to the backend
 * endpoint POST /api/errors/report, which forwards to Discord.
 *
 * Three capture points:
 *   1. React Error Boundary (component crashes)
 *   2. window.onerror (uncaught runtime errors)
 *   3. window.onunhandledrejection (unhandled promise rejections)
 *
 * Also exports reportError() for manual reporting.
 * @module lib/error-report
 */

import {
  type ErrorReportPayload,
  type ErrorCaptureMethod,
  type ErrorSeverity,
} from "@/lib/contracts/error.contract";

const API_BASE = import.meta.env.VITE_API_URL || "";
const REPORT_ENDPOINT = `${API_BASE}/api/errors/report`;

/** Dedupe window — prevent sending the same error repeatedly. */
const DEDUPE_MS = 5000;
const recentErrors = new Map<string, number>();

/**
 * Check if an error is a duplicate within the dedupe window.
 * Keyed on message + stack first line.
 */
function isDuplicate(message: string, stack?: string): boolean {
  const key = `${message}::${stack?.split("\n")[0] ?? ""}`;
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < DEDUPE_MS) return true;
  recentErrors.set(key, now);
  // Prune old entries
  if (recentErrors.size > 50) {
    for (const [k, t] of recentErrors) {
      if (now - t > DEDUPE_MS) recentErrors.delete(k);
    }
  }
  return false;
}

/**
 * Send an error report to the backend.
 * Silently fails — error reporting must never throw or break the app.
 */
export async function reportError(
  error: unknown,
  captureMethod: ErrorCaptureMethod = "manual",
  severity: ErrorSeverity = "error",
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

    const stack = error instanceof Error ? error.stack : undefined;

    if (isDuplicate(message, stack)) return;

    const payload: ErrorReportPayload = {
      message,
      stack,
      source: "frontend",
      captureMethod,
      severity,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Use raw fetch — api.ts throws on non-OK, but we want silent failure
    await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent failure — error reporting must not throw
  }
}

/**
 * Install global error listeners on window.
 * Call once at app startup.
 */
export function installGlobalErrorListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "windowOnError", "error", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      "unhandledRejection",
      "error",
    );
  });
}
