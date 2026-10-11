import { describe, it, expect } from "vitest";
import {
  isFormulaInjectionRisk,
  escapeFormulaText,
  toSafeCellText,
  toMonetaryCell,
  toDateCell,
} from "../../src/security/sanitize.js";

// T23 — Formula injection prevention
describe("T23 FormulaInjectionPrevention", () => {
  it("detects formula-leading strings", () => {
    expect(isFormulaInjectionRisk("=cmd")).toBe(true);
    expect(isFormulaInjectionRisk("+1")).toBe(true);
    expect(isFormulaInjectionRisk("-1")).toBe(true);
    expect(isFormulaInjectionRisk("@sum")).toBe(true);
    expect(isFormulaInjectionRisk("\tfoo")).toBe(true);
    expect(isFormulaInjectionRisk("safe text")).toBe(false);
    expect(isFormulaInjectionRisk("123")).toBe(false);
    expect(isFormulaInjectionRisk(null)).toBe(false);
  });

  it("neutralizes formula-leading strings with a single quote", () => {
    expect(escapeFormulaText("=cmd()")).toBe("'=cmd()");
    expect(escapeFormulaText("+1")).toBe("'+1");
    expect(escapeFormulaText("plain")).toBe("plain");
  });

  it("converts null/undefined to empty text, never 'null' or a formula", () => {
    expect(toSafeCellText(null)).toBe("");
    expect(toSafeCellText(undefined)).toBe("");
    expect(toSafeCellText("=danger")).toBe("'=danger");
  });
});

// T21 — int64 precision preserved (never Number())
describe("T21 PreserveInt64", () => {
  it("keeps large int64 as exact decimal string", () => {
    const big = "9223372036854775807";
    expect(toSafeCellText(BigInt(big))).toBe(big);
    expect(toSafeCellText(big)).toBe(big);
  });
});

// T22 — Monetary formatting
describe("T22 MonetaryFormatting", () => {
  it("parses monetary strings into numbers with currency format", () => {
    const m = toMonetaryCell("$1,234.50");
    expect(m).not.toBeNull();
    expect(m!.value).toBe(1234.5);
    expect(m!.numberFormat).toContain("$");
    expect(m!.numberFormat).toContain("0.00");
  });
  it("returns null for non-monetary input", () => {
    expect(toMonetaryCell("abc")).toBeNull();
    expect(toMonetaryCell(null)).toBeNull();
  });
});

// Date handling for status payloads
describe("date formatting", () => {
  it("formats ISO dates", () => {
    const d = toDateCell("2026-01-02T03:04:05Z");
    expect(d.value).toBe("2026-01-02");
    expect(d.numberFormat).toBe("yyyy-mm-dd");
  });
  it("falls back to text for unparseable dates", () => {
    const d = toDateCell("not-a-date");
    expect(d.numberFormat).toBe("@");
  });
});
