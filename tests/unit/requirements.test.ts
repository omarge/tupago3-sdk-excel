import { describe, it, expect, afterEach } from "vitest";
import { isExcelApiSupported, getOfficeHost, officeReady } from "../../src/office/requirements.js";

// T03 — Requirement set detection
describe("T03 RequirementSetDetection", () => {
  afterEach(() => {
    delete (globalThis as any).Office;
  });

  it("returns false when Office is absent", () => {
    delete (globalThis as any).Office;
    expect(isExcelApiSupported("1.1")).toBe(false);
  });

  it("returns true when ExcelApi 1.1 is supported", () => {
    (globalThis as any).Office = {
      context: { requirements: { isSetSupported: (s: string, v: string) => s === "ExcelApi" && v === "1.1" } },
    };
    expect(isExcelApiSupported("1.1")).toBe(true);
  });

  it("returns false when a higher requirement is unsupported", () => {
    (globalThis as any).Office = {
      context: { requirements: { isSetSupported: () => false } },
    };
    expect(isExcelApiSupported("1.14")).toBe(false);
  });

  it("reports host when present", () => {
    (globalThis as any).Office = { context: { host: "Excel", requirements: { isSetSupported: () => true } } };
    expect(getOfficeHost()).toBe("Excel");
  });
});

// T02 — Office initialization
describe("T02 OfficeInitialization", () => {
  it("resolves when Office.onReady is available", async () => {
    let cb: (() => void) | null = null;
    (globalThis as any).Office = { onReady: (fn: () => void) => (cb = fn) };
    const p = officeReady();
    cb!();
    await expect(p).resolves.toBeUndefined();
  });
  it("resolves immediately when Office is absent (graceful)", async () => {
    delete (globalThis as any).Office;
    await expect(officeReady()).resolves.toBeUndefined();
  });
});
