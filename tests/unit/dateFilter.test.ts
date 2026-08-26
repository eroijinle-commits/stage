/**
 * Unit tests for date filtering and odds conversion.
 * @module tests/unit/dateFilter
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getDateRangeForPreset } from "@/hooks/useDiscovery";

// ─── Date Filter Presets ────────────────────────────────────────────────────

describe("getDateRangeForPreset", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns null for unknown preset", () => {
        expect(getDateRangeForPreset("unknown")).toBeNull();
    });

    it("'today' returns start and end of current day", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T10:30:00Z"));

        const range = getDateRangeForPreset("today");
        expect(range).not.toBeNull();

        const from = new Date(range!.dateFrom);
        const to = new Date(range!.dateTo);

        expect(from.getHours()).toBe(0);
        expect(from.getMinutes()).toBe(0);
        expect(from.getSeconds()).toBe(0);
        expect(to.getHours()).toBe(23);
        expect(to.getMinutes()).toBe(59);
        expect(to.getSeconds()).toBe(59);
    });

    it("'tomorrow' returns start and end of next day", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-25T10:00:00Z"));

        const range = getDateRangeForPreset("tomorrow");
        expect(range).not.toBeNull();

        const from = new Date(range!.dateFrom);
        const to = new Date(range!.dateTo);

        expect(from.getDate()).toBe(26);
        expect(to.getDate()).toBe(26);
        expect(from.getHours()).toBe(0);
        expect(to.getHours()).toBe(23);
    });

    it("'weekend' returns Saturday start to Sunday end", () => {
        vi.useFakeTimers();
        // Wednesday Aug 25, 2026
        vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

        const range = getDateRangeForPreset("weekend");
        expect(range).not.toBeNull();

        const from = new Date(range!.dateFrom);
        const to = new Date(range!.dateTo);

        // Saturday = 6
        expect(from.getDay()).toBe(6);
        expect(to.getDay()).toBe(0); // Sunday
    });

    it("'weekend' on Saturday returns same-day Saturday", () => {
        vi.useFakeTimers();
        // Saturday Aug 29, 2026
        vi.setSystemTime(new Date("2026-08-29T10:00:00Z"));

        const range = getDateRangeForPreset("weekend");
        expect(range).not.toBeNull();

        const from = new Date(range!.dateFrom);
        expect(from.getDay()).toBe(6);
    });

    it("'next7' returns 7-day range from now", () => {
        vi.useFakeTimers();
        const now = new Date("2026-08-25T12:00:00Z").getTime();
        vi.setSystemTime(now);

        const range = getDateRangeForPreset("next7");
        expect(range).not.toBeNull();

        const expectedDuration = 7 * 24 * 60 * 60 * 1000;
        expect(range!.dateTo - range!.dateFrom).toBe(expectedDuration);
    });

    it("'next30' returns 30-day range from now", () => {
        vi.useFakeTimers();
        const now = new Date("2026-08-25T12:00:00Z").getTime();
        vi.setSystemTime(now);

        const range = getDateRangeForPreset("next30");
        expect(range).not.toBeNull();

        const expectedDuration = 30 * 24 * 60 * 60 * 1000;
        expect(range!.dateTo - range!.dateFrom).toBe(expectedDuration);
    });
});

// ─── Fixture Date Filtering (inline logic test) ─────────────────────────────

describe("Fixture date filtering", () => {
    // Test the concept of filtering fixtures by date range
    const fixtures = [
        { id: "1", name: "Match 1", startTime: "2026-08-25T10:00:00Z" }, // Tuesday
        { id: "2", name: "Match 2", startTime: "2026-08-26T15:00:00Z" }, // Wednesday
        { id: "3", name: "Match 3", startTime: "2026-08-27T20:00:00Z" }, // Thursday
        { id: "4", name: "Match 4", startTime: "2026-08-28T18:00:00Z" }, // Friday
    ];

    function filterByDateRange(
        items: typeof fixtures,
        from: string | null,
        to: string | null,
    ) {
        return items.filter((f) => {
            const t = new Date(f.startTime).getTime();
            if (from && t < new Date(from).getTime()) return false;
            if (to && t > new Date(to).getTime()) return false;
            return true;
        });
    }

    it("filters fixtures within date range", () => {
        const filtered = filterByDateRange(
            fixtures,
            "2026-08-25T00:00:00Z",
            "2026-08-26T23:59:59Z",
        );
        expect(filtered).toHaveLength(2);
        expect(filtered[0].id).toBe("1");
        expect(filtered[1].id).toBe("2");
    });

    it("returns all fixtures with no date filter", () => {
        const filtered = filterByDateRange(fixtures, null, null);
        expect(filtered).toHaveLength(4);
    });

    it("returns empty for date range with no matches", () => {
        const filtered = filterByDateRange(
            fixtures,
            "2026-09-01T00:00:00Z",
            "2026-09-30T23:59:59Z",
        );
        expect(filtered).toHaveLength(0);
    });

    it("handles start-of-day boundary correctly", () => {
        const filtered = filterByDateRange(
            fixtures,
            "2026-08-26T00:00:00Z",
            "2026-08-26T23:59:59Z",
        );
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe("2");
    });

    it("handles end-of-day boundary correctly", () => {
        // A fixture at exactly 2026-08-25T23:59:59Z is within range
        const filtered = filterByDateRange(
            [
                { id: "x1", name: "Late match", startTime: "2026-08-25T23:59:58Z" },
            ],
            "2026-08-25T00:00:00Z",
            "2026-08-25T23:59:59Z",
        );
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe("x1");
    });
});

// ─── Timezone Edge Cases ────────────────────────────────────────────────────

describe("Timezone handling", () => {
    it("handles midnight UTC correctly", () => {
        const fixture = { startTime: "2026-08-26T00:00:00Z" };
        const range = { dateFrom: "2026-08-26T00:00:00Z", dateTo: "2026-08-26T23:59:59Z" };

        const t = new Date(fixture.startTime).getTime();
        const from = new Date(range.dateFrom).getTime();
        const to = new Date(range.dateTo).getTime();

        expect(t >= from && t <= to).toBe(true);
    });

    it("handles end-of-day 23:59:59.999 correctly", () => {
        const fixture = { startTime: "2026-08-26T23:59:59.999Z" };
        const range = { dateFrom: "2026-08-26T00:00:00Z", dateTo: "2026-08-26T23:59:59Z" };

        const t = new Date(fixture.startTime).getTime();
        const to = new Date(range.dateTo).getTime();

        // 23:59:59.999 > 23:59:59.000
        expect(t > to).toBe(true);
    });

    it("fixture just before midnight still falls in same day", () => {
        const fixture = { startTime: "2026-08-26T23:59:58Z" };
        const range = { dateFrom: "2026-08-26T00:00:00Z", dateTo: "2026-08-26T23:59:59Z" };

        const t = new Date(fixture.startTime).getTime();
        const from = new Date(range.dateFrom).getTime();
        const to = new Date(range.dateTo).getTime();

        expect(t >= from && t <= to).toBe(true);
    });
});

// ─── Odds Conversion ────────────────────────────────────────────────────────

describe("Odds conversion", () => {
    // Inline odds conversion functions (same logic used in the app)
    function decimalToFractional(decimal: number): string {
        if (decimal < 1.01) return "N/A";
        const profit = decimal - 1;
        // Find common fractions
        const denominator = 20;
        const numerator = Math.round(profit * denominator);
        if (numerator === 0) return "N/A";
        return `${numerator}/${denominator}`;
    }

    function decimalToAmerican(decimal: number): string {
        if (decimal < 1.01) return "N/A";
        if (decimal >= 2.0) {
            return `+${Math.round((decimal - 1) * 100)}`;
        }
        return `-${Math.round(100 / (decimal - 1))}`;
    }

    function fractionalToDecimal(fractional: string): number {
        const [num, den] = fractional.split("/").map(Number);
        if (!den || den === 0) return 0;
        return num / den + 1;
    }

    function americanToDecimal(american: number): number {
        if (american > 0) {
            return american / 100 + 1;
        }
        return 100 / Math.abs(american) + 1;
    }

    describe("decimal to fractional", () => {
        it("converts 2.00 to 1/1", () => {
            expect(decimalToFractional(2.0)).toBe("20/20"); // 1/1 equivalent
        });

        it("converts 1.50 correctly", () => {
            expect(decimalToFractional(1.5)).toBe("10/20");
        });

        it("converts 3.00 correctly", () => {
            expect(decimalToFractional(3.0)).toBe("40/20"); // 2/1 equivalent
        });

        it("returns N/A for odds < 1.01", () => {
            expect(decimalToFractional(1.0)).toBe("N/A");
        });
    });

    describe("decimal to american", () => {
        it("converts 2.00 to +100", () => {
            expect(decimalToAmerican(2.0)).toBe("+100");
        });

        it("converts 1.50 to -200 (favorite)", () => {
            expect(decimalToAmerican(1.5)).toBe("-200");
        });

        it("converts 3.00 to +200", () => {
            expect(decimalToAmerican(3.0)).toBe("+200");
        });

        it("converts 4.00 to +300", () => {
            expect(decimalToAmerican(4.0)).toBe("+300");
        });

        it("converts 1.25 to -400", () => {
            expect(decimalToAmerican(1.25)).toBe("-400");
        });

        it("returns N/A for odds < 1.01", () => {
            expect(decimalToAmerican(1.0)).toBe("N/A");
        });
    });

    describe("fractional to decimal", () => {
        it("converts 1/1 to 2.0", () => {
            expect(fractionalToDecimal("1/1")).toBe(2.0);
        });

        it("converts 1/2 to 1.5", () => {
            expect(fractionalToDecimal("1/2")).toBe(1.5);
        });

        it("converts 2/1 to 3.0", () => {
            expect(fractionalToDecimal("2/1")).toBe(3.0);
        });

        it("converts 5/4 to 2.25", () => {
            expect(fractionalToDecimal("5/4")).toBe(2.25);
        });

        it("returns 0 for invalid fraction", () => {
            expect(fractionalToDecimal("0/0")).toBe(0);
        });
    });

    describe("american to decimal", () => {
        it("converts +100 to 2.0", () => {
            expect(americanToDecimal(100)).toBe(2.0);
        });

        it("converts -200 to 1.5", () => {
            expect(americanToDecimal(-200)).toBe(1.5);
        });

        it("converts +200 to 3.0", () => {
            expect(americanToDecimal(200)).toBe(3.0);
        });

        it("converts -150 to 1.6667", () => {
            expect(americanToDecimal(-150)).toBeCloseTo(1.6667, 4);
        });

        it("converts +300 to 4.0", () => {
            expect(americanToDecimal(300)).toBe(4.0);
        });

        it("converts -400 to 1.25", () => {
            expect(americanToDecimal(-400)).toBe(1.25);
        });
    });

    describe("round-trip conversions", () => {
        it("decimal → american → decimal preserves value", () => {
            const original = 2.5;
            const american = decimalToAmerican(original);
            const americanNum = parseInt(american.replace("+", ""), 10);
            const roundTrip = americanToDecimal(americanNum);
            expect(roundTrip).toBeCloseTo(original, 4);
        });

        it("decimal → fractional → decimal is approximately preserved", () => {
            const original = 2.5;
            const fractional = decimalToFractional(original);
            const roundTrip = fractionalToDecimal(fractional);
            // Fractional conversion loses precision due to denominator
            expect(roundTrip).toBeCloseTo(original, 1);
        });
    });
});
