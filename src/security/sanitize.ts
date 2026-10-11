// Security helpers: treat every remote/provider value as untrusted.
// Goal: never let provider data become an executable Excel formula or leak secrets to logs.

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Returns true when a raw string, if written verbatim into an Excel cell, would be
 * interpreted as a formula (formula injection). Such values must be neutralized.
 */
export function isFormulaInjectionRisk(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const first = value[0];
  return FORMULA_TRIGGERS.includes(first) || /^[=+@\t\r-]/.test(value);
}

/**
 * Neutralize a string so Excel renders it as literal text rather than a formula.
 * Prefixes a single quote (Excel's text-escape) when the first character is a
 * formula trigger. The single quote itself is hidden by Excel on display.
 */
export function escapeFormulaText(value: string): string {
  if (value.length === 0) return value;
  const first = value[0];
  if (FORMULA_TRIGGERS.includes(first)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Normalize an arbitrary provider value into a safe cell string.
 * - null/undefined -> "" (never "null" text, never a formula).
 * - bigint (int64) -> decimal string (no precision loss, never Number()).
 * - number -> JSON-safe string.
 * - string -> formula-injection escaped.
 */
export function toSafeCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  const s = String(value);
  return escapeFormulaText(s);
}

/**
 * Format a monetary value as a number with a 2-decimal currency number format.
 * The numeric value is preserved (not stringified) so Excel keeps it computable,
 * while the display uses currency formatting. Returns null if unparseable.
 */
export function toMonetaryCell(raw: unknown, currencySymbol = "$"): { value: number; numberFormat: string } | null {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "-") return null;
    n = Number(cleaned);
  } else {
    return null;
  }
  if (!Number.isFinite(n)) return null;
  return { value: n, numberFormat: `${currencySymbol}#,##0.00` };
}

/**
 * Format an ISO-ish date string into a display date. Returns the original safe text if not parseable.
 */
export function toDateCell(raw: unknown): { value: string; numberFormat: string } {
  const text = toSafeCellText(raw);
  const t = Date.parse(text);
  if (Number.isNaN(t)) return { value: text, numberFormat: "@" };
  return { value: new Date(t).toISOString().slice(0, 10), numberFormat: "yyyy-mm-dd" };
}
