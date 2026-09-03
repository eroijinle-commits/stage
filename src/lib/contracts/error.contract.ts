/**
 * Error reporting contract — shapes for the error reporting pipeline.
 * Frontend captures errors, sends them to Express, which forwards to Discord.
 * @module lib/contracts/error.contract
 */

/** Where the error was captured. */
export type ErrorSource = "frontend" | "backend";

/** What kind of capture mechanism caught the error. */
export type ErrorCaptureMethod =
  | "errorBoundary" // React Error Boundary
  | "windowOnError" // window.onerror
  | "unhandledRejection" // window.onunhandledrejection
  | "expressMiddleware" // Express error middleware
  | "manual"; // Explicit reportError() call

/** Severity level for Discord formatting. */
export type ErrorSeverity = "error" | "warning" | "info";

/** Payload sent from the frontend to POST /api/errors/report. */
export interface ErrorReportPayload {
  message: string;
  stack?: string;
  source: ErrorSource;
  captureMethod: ErrorCaptureMethod;
  severity?: ErrorSeverity;
  url?: string;
  userAgent?: string;
  /** Arbitrary metadata — will be sanitized server-side. */
  metadata?: Record<string, unknown>;
  /** ISO timestamp string. */
  timestamp: string;
}

/** Payload sent to the Discord webhook. */
export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: DiscordEmbedField[];
  timestamp: string;
  footer?: { text: string };
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** Response from POST /api/errors/report. */
export interface ErrorReportResponse {
  ok: boolean;
  /** "deduplicated" if the error was suppressed as a duplicate. */
  reason?: "deduplicated" | "disabled" | "sent";
}
