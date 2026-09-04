/**
 * Value Scanner error handling — structured logging, classification, retry helpers.
 * @module lib/scanner/errors
 */

import type { StakeApiErrorType } from "@/lib/stake-api/types";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// ─── Error Context ──────────────────────────────────────────────────────────

export type ScannerPhase =
    | "fetch-fixtures"
    | "fetch-details"
    | "analyze-odds"
    | "unknown";

export interface ScannerFilters {
    sport: string;
    minGapRatio: number;
    outcomeCount: number | null;
    dateFrom: number | null;
    dateTo: number | null;
}

export interface ScannerErrorContext {
    phase: ScannerPhase;
    fixtureId?: string;
    fixtureSlug?: string;
    sport: string;
    filters: ScannerFilters;
    timestamp: number;
    raw: unknown;
    classified: StakeApiErrorType;
    userMessage: string;
}

// ─── Structured Logger ──────────────────────────────────────────────────────

/**
 * Log a scanner error with full structured context.
 * Outputs to console.error with [ValueScanner] prefix for DevTools filtering.
 */
export function logScannerError(ctx: ScannerErrorContext): void {
    console.error(
        `[ValueScanner] phase=${ctx.phase} sport=${ctx.sport} ` +
        `threshold=${ctx.filters.minGapRatio}x outcomes=${ctx.filters.outcomeCount ?? "any"} ` +
        `error=${ctx.classified}`,
        ctx.fixtureId ? `fixture=${ctx.fixtureId}` : "",
        ctx.raw instanceof Error ? ctx.raw.message : ctx.raw,
    );
}

/**
 * Build a ScannerErrorContext from a caught error.
 */
export function buildScannerErrorContext(
    err: unknown,
    phase: ScannerPhase,
    sport: string,
    filters: ScannerFilters,
    fixtureId?: string,
    fixtureSlug?: string,
): ScannerErrorContext {
    const classified = classifyError(err);
    const userMessage = getUserFriendlyMessage(classified);
    const ctx: ScannerErrorContext = {
        phase,
        fixtureId,
        fixtureSlug,
        sport,
        filters,
        timestamp: Date.now(),
        raw: err,
        classified,
        userMessage,
    };
    logScannerError(ctx);
    return ctx;
}

// ─── Retry Helper ───────────────────────────────────────────────────────────

/** Error types that are transient and worth retrying. */
const RETRYABLE: StakeApiErrorType[] = ["networkError", "rateLimited", "unknown"];

/**
 * Check if an error type is worth retrying.
 */
export function isRetryable(errType: StakeApiErrorType): boolean {
    return RETRYABLE.includes(errType);
}

// ─── Per-Fixture Error Tracking ─────────────────────────────────────────────

export interface FixtureFailure {
    fixtureId: string;
    fixtureSlug?: string;
    phase: ScannerPhase;
    error: string;
    timestamp: number;
}

// ─── Error Boundary Fallback ────────────────────────────────────────────────

interface FallbackProps {
    children: ReactNode;
}

interface FallbackState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary specifically for the Value Scanner page.
 * Shows a scoped fallback that doesn't crash the whole app.
 */
export class ScannerErrorBoundary extends Component<FallbackProps, FallbackState> {
    constructor(props: FallbackProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): FallbackState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ValueScanner:ErrorBoundary]", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className= "flex flex-col items-center justify-center h-full bg-background text-foreground p-8" >
                <div className="max-w-md text-center" >
                    <AlertTriangle size={ 32 } className = "mx-auto mb-3 text-bet-lost" />
                        <h2 className="text-lg font-mono font-semibold mb-2" > Scanner Crashed </h2>
                            < p className = "text-muted-foreground text-xs font-mono mb-4" >
                                { this.state.error?.message ?? "An unexpected error occurred in the Value Scanner." }
                                </p>
                                < button
            onClick = { this.handleReset }
            className = "flex items-center gap-2 mx-auto px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-mono hover:opacity-90 transition-opacity"
                >
                <RefreshCw size={ 12 } />
              Try again
                </button>
                </div>
                </div>
      );
        }

        return this.props.children;
    }
}
