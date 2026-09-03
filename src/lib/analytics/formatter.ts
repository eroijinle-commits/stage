import type { OddsFormat } from "@/lib/contracts/db.contract";

/**
 * Format a number as currency with NGN symbol.
 */
export function formatCurrency(amount: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : "$";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

/**
 * Format odds in the requested display format.
 */
export function formatOdds(odds: number, format: OddsFormat = "decimal"): string {
  if (odds <= 0) return "—";

  switch (format) {
    case "fractional": {
      const profit = odds - 1;
      const num = Math.round(profit * 100);
      const den = 100;
      const g = gcd(num, den);
      return `${num / g}/${den / g}`;
    }
    case "american": {
      if (odds >= 2) {
        return `+${Math.round((odds - 1) * 100)}`;
      }
      return `${Math.round(-100 / (odds - 1))}`;
    }
    case "decimal":
    default:
      return odds.toFixed(2);
  }
}

/**
 * Format a percentage value.
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date using the browser's locale or a given format hint.
 * Supports "date", "datetime", "time", "short" presets.
 */
export function formatDate(date: Date | number, format: string = "date"): string {
  const d = typeof date === "number" ? new Date(date * 1000) : date;

  switch (format) {
    case "datetime":
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    case "time":
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "short":
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
    case "iso":
      return d.toISOString().split("T")[0];
    case "date":
    default:
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
  }
}

/**
 * Format a number with fixed decimals.
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Greatest common divisor (Euclidean). */
function gcd(a: number, b: number): number {
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  if (absB === 0) return absA;
  return gcd(absB, absA % absB);
}
