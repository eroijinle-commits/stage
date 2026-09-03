/**
 * Discord webhook sender — builds embed payloads and sends to Discord.
 * Server-side only — the webhook URL never reaches the frontend.
 * @module server/discord-webhook
 */

import type {
  ErrorReportPayload,
  DiscordWebhookPayload,
  DiscordEmbed,
  ErrorSeverity,
} from "../src/lib/contracts/error.contract";

const WEBHOOK_URL = process.env.DISCORD_ERROR_WEBHOOK_URL;
const DEDUPE_MS = 10_000;
const MAX_FIELD_VALUE = 1024;
const MAX_STACK_LINES = 15;

// Server-side dedupe — prevents Discord spam from backend error loops
const recentErrors = new Map<string, number>();

/** Discord embed colors per severity. */
const COLORS: Record<ErrorSeverity, number> = {
  error: 0xff4444, // red
  warning: 0xffaa00, // orange
  info: 0x3498db, // blue
};

/** Truncate a string to fit Discord field limits. */
function truncate(str: string, max: number = MAX_FIELD_VALUE): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

/** Truncate stack trace to most relevant lines. */
function truncateStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split("\n").slice(0, MAX_STACK_LINES);
  return truncate(lines.join("\n"));
}

/** Strip sensitive data from a metadata object. */
function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const SENSITIVE_KEYS = [
    "token",
    "accesstoken",
    "x-access-token",
    "authorization",
    "password",
    "apikey",
    "api_key",
    "secret",
    "databaseurl",
    "database_url",
    "encryptionkey",
    "encryption_key",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > MAX_FIELD_VALUE) {
      sanitized[key] = truncate(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Check if this error is a duplicate within the dedupe window. */
function isDuplicate(payload: ErrorReportPayload): boolean {
  const key = `${payload.source}::${payload.captureMethod}::${payload.message}`;
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < DEDUPE_MS) return true;
  recentErrors.set(key, now);
  // Prune
  if (recentErrors.size > 100) {
    for (const [k, t] of recentErrors) {
      if (now - t > DEDUPE_MS) recentErrors.delete(k);
    }
  }
  return false;
}

/** Build a Discord embed from an error report payload. */
function buildEmbed(payload: ErrorReportPayload): DiscordEmbed {
  const severity: ErrorSeverity = payload.severity ?? "error";
  const fields: DiscordEmbed["fields"] = [];

  fields.push({
    name: "Source",
    value: `\`${payload.source}\``,
    inline: true,
  });
  fields.push({
    name: "Capture",
    value: `\`${payload.captureMethod}\``,
    inline: true,
  });

  if (payload.url) {
    fields.push({ name: "URL", value: truncate(payload.url), inline: false });
  }

  if (payload.userAgent) {
    // Shorten UA to just the browser/OS part
    const uaMatch = payload.userAgent.match(/\(([^)]+)\)/);
    fields.push({
      name: "Environment",
      value: uaMatch ? `\`${uaMatch[1]}\`` : truncate(payload.userAgent, 200),
      inline: true,
    });
  }

  const stack = truncateStack(payload.stack);
  if (stack) {
    fields.push({
      name: "Stack Trace",
      value: `\`\`\`${stack}\`\`\``,
      inline: false,
    });
  }

  const sanitizedMeta = sanitizeMetadata(payload.metadata);
  if (sanitizedMeta && Object.keys(sanitizedMeta).length > 0) {
    const metaStr = truncate(JSON.stringify(sanitizedMeta, null, 2));
    fields.push({
      name: "Metadata",
      value: `\`\`\`json\n${metaStr}\n\`\`\``,
      inline: false,
    });
  }

  return {
    title: truncate(payload.message, 256),
    description: "",
    color: COLORS[severity],
    fields,
    timestamp: payload.timestamp,
    footer: { text: "Stage Error Reporter" },
  };
}

/**
 * Send an error report to Discord.
 * Returns false if the webhook is not configured or the error was deduplicated.
 * Never throws — logs failures to console only.
 */
export async function sendErrorToDiscord(
  payload: ErrorReportPayload,
): Promise<"sent" | "deduplicated" | "disabled"> {
  if (!WEBHOOK_URL) return "disabled";

  if (isDuplicate(payload)) return "deduplicated";

  try {
    const discordPayload: DiscordWebhookPayload = {
      username: "Stage Error Reporter",
      embeds: [buildEmbed(payload)],
    };

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      console.error(
        `[discord-webhook] Failed to send error report: ${response.status} ${response.statusText}`,
      );
    }

    return "sent";
  } catch (err) {
    console.error("[discord-webhook] Error sending to Discord:", err);
    return "disabled";
  }
}
