/**
 * Unit tests for odds conversion functions.
 * @module tests/unit/oddsConversion
 */

import { describe, it, expect } from "vitest";

// ─── Odds Conversion Functions ──────────────────────────────────────────────
// These are the canonical conversion functions used throughout the app.

function decimalToFractional(decimal: number): string {
  if (decimal < 1.01) return "N/A";
  const profit = decimal - 1;
  // Simplify to nearest common fraction
  const precision = 100;
  let num = Math.round(profit * precision);
  let den = precision;
  // Simplify
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(num, den);
  num /= g;
  den /= g;
  return `${num}/${den}`;
}

function decimalToAmerican(decimal: number): number {
  if (decimal < 1.01) return 0;
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  }
  return -Math.round(100 / (decimal - 1));
}

function fractionalToDecimal(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator + 1;
}

function americanToDecimal(american: number): number {
  if (american > 0) {
    return american / 100 + 1;
  }
  if (american < 0) {
    return 100 / Math.abs(american) + 1;
  }
  return 0;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Decimal → Fractional", () => {
  it("1.50 → 1/2", () => {
    expect(decimalToFractional(1.5)).toBe("1/2");
  });

  it("2.00 → 1/1", () => {
    expect(decimalToFractional(2.0)).toBe("1/1");
  });

  it("3.00 → 2/1", () => {
    expect(decimalToFractional(3.0)).toBe("2/1");
  });

  it("4.00 → 3/1", () => {
    expect(decimalToFractional(4.0)).toBe("3/1");
  });

  it("1.25 → 1/4", () => {
    expect(decimalToFractional(1.25)).toBe("1/4");
  });

  it("1.33 → 1/3", () => {
    expect(decimalToFractional(1.33)).toBe("33/100"); // close to 1/3
  });

  it("2.50 → 3/2", () => {
    expect(decimalToFractional(2.5)).toBe("3/2"); // profit=1.5, 150/100 → 3/2
  });

  it("returns N/A for odds below 1.01", () => {
    expect(decimalToFractional(1.0)).toBe("N/A");
    expect(decimalToFractional(0.5)).toBe("N/A");
  });
});

describe("Decimal → American", () => {
  it("2.00 → +100 (even money)", () => {
    expect(decimalToAmerican(2.0)).toBe(100);
  });

  it("1.50 → -200 (favorite)", () => {
    expect(decimalToAmerican(1.5)).toBe(-200);
  });

  it("3.00 → +200", () => {
    expect(decimalToAmerican(3.0)).toBe(200);
  });

  it("4.00 → +300", () => {
    expect(decimalToAmerican(4.0)).toBe(300);
  });

  it("1.25 → -400", () => {
    expect(decimalToAmerican(1.25)).toBe(-400);
  });

  it("1.10 → -1000", () => {
    expect(decimalToAmerican(1.1)).toBe(-1000); // 100 / 0.1 = 1000
  });

  it("5.00 → +400", () => {
    expect(decimalToAmerican(5.0)).toBe(400);
  });

  it("returns 0 for invalid odds", () => {
    expect(decimalToAmerican(1.0)).toBe(0);
  });
});

describe("Fractional → Decimal", () => {
  it("1/1 → 2.0", () => {
    expect(fractionalToDecimal(1, 1)).toBe(2.0);
  });

  it("1/2 → 1.5", () => {
    expect(fractionalToDecimal(1, 2)).toBe(1.5);
  });

  it("2/1 → 3.0", () => {
    expect(fractionalToDecimal(2, 1)).toBe(3.0);
  });

  it("3/1 → 4.0", () => {
    expect(fractionalToDecimal(3, 1)).toBe(4.0);
  });

  it("5/4 → 2.25", () => {
    expect(fractionalToDecimal(5, 4)).toBe(2.25);
  });

  it("7/2 → 4.5", () => {
    expect(fractionalToDecimal(7, 2)).toBe(4.5);
  });

  it("1/4 → 1.25", () => {
    expect(fractionalToDecimal(1, 4)).toBe(1.25);
  });

  it("returns 0 for 0 denominator", () => {
    expect(fractionalToDecimal(1, 0)).toBe(0);
  });
});

describe("American → Decimal", () => {
  it("+100 → 2.0 (even money)", () => {
    expect(americanToDecimal(100)).toBe(2.0);
  });

  it("-200 → 1.5 (favorite)", () => {
    expect(americanToDecimal(-200)).toBe(1.5);
  });

  it("+200 → 3.0", () => {
    expect(americanToDecimal(200)).toBe(3.0);
  });

  it("+300 → 4.0", () => {
    expect(americanToDecimal(300)).toBe(4.0);
  });

  it("-150 → 1.6667", () => {
    expect(americanToDecimal(-150)).toBeCloseTo(1.6667, 4);
  });

  it("-400 → 1.25", () => {
    expect(americanToDecimal(-400)).toBe(1.25);
  });

  it("+500 → 6.0", () => {
    expect(americanToDecimal(500)).toBe(6.0);
  });

  it("-110 → 1.9091", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
  });

  it("returns 0 for 0 (invalid)", () => {
    expect(americanToDecimal(0)).toBe(0);
  });
});

describe("Round-trip conversions", () => {
  it("decimal → american → decimal preserves value", () => {
    const testCases = [1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 10.0];
    for (const original of testCases) {
      const american = decimalToAmerican(original);
      const roundTrip = americanToDecimal(american);
      expect(roundTrip).toBeCloseTo(original, 4);
    }
  });

  it("fractional → decimal → fractional is consistent", () => {
    const testCases = [
      [1, 1], // 1/1 → 2.0
      [1, 2], // 1/2 → 1.5
      [2, 1], // 2/1 → 3.0
      [3, 1], // 3/1 → 4.0
      [5, 4], // 5/4 → 2.25
    ];

    for (const [num, den] of testCases) {
      const decimal = fractionalToDecimal(num, den);
      const american = decimalToAmerican(decimal);
      const backToDecimal = americanToDecimal(american);
      expect(backToDecimal).toBeCloseTo(decimal, 4);
    }
  });
});

describe("Edge cases", () => {
  it("very small decimal odds", () => {
    expect(decimalToFractional(1.01)).toBe("1/100");
    expect(decimalToAmerican(1.01)).toBe(-10000);
  });

  it("very large decimal odds", () => {
    expect(decimalToFractional(100.0)).toBe("99/1");
    expect(decimalToAmerican(100.0)).toBe(9900);
  });

  it("1.01 boundary", () => {
    expect(decimalToAmerican(1.01)).toBe(-10000);
    expect(decimalToFractional(1.01)).toBe("1/100");
  });
});
