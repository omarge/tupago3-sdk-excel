import { describe, it, expect } from "vitest";
import { resolveTarget, buildSheetArrays, RangeOccupiedError, type ResolveTargetInput } from "../../src/excel/excelOps.js";
import type { WorksheetModel } from "../../src/models/types.js";

function base(overrides: Partial<ResolveTargetInput> = {}): ResolveTargetInput {
  return {
    activeSheetName: "Hoja1",
    activeSheetExists: true,
    activeSheetIsEmpty: false,
    activeSheetIsManaged: false,
    confirmOverwrite: false,
    preferNewSheet: true,
    baseName: "TuPago3_Cliente",
    ...overrides,
  };
}

// T24 — No overwrite without protection
describe("T24 NoOverwriteWithoutProtection", () => {
  it("creates a new dedicated sheet by default (no overwrite)", () => {
    const plan = resolveTarget(base());
    expect(plan.action).toBe("create-new");
    expect(plan.targetSheetName).not.toBe("Hoja1");
  });
  it("throws when target is occupied, non-managed and not confirmed", () => {
    expect(() => resolveTarget(base({ preferNewSheet: false }))).toThrow(RangeOccupiedError);
  });
  it("refreshes an existing managed (TuPago3_) sheet without confirmation", () => {
    const plan = resolveTarget(base({ preferNewSheet: false, activeSheetIsManaged: true, activeSheetName: "TuPago3_Cliente" }));
    expect(plan.action).toBe("refresh-active");
  });
  it("allows overwrite only when explicitly confirmed", () => {
    const plan = resolveTarget(base({ preferNewSheet: false, confirmOverwrite: true }));
    expect(plan.action).toBe("overwrite-active");
  });
  it("overwrites an empty sheet without confirmation", () => {
    const plan = resolveTarget(base({ preferNewSheet: false, activeSheetIsEmpty: true }));
    expect(plan.action).toBe("refresh-active");
  });
});

// T17/T18 — buildSheetArrays materializes values + formats
describe("buildSheetArrays", () => {
  const model: WorksheetModel = {
    name: "X",
    headers: ["a", "b"],
    rows: [
      [{ value: "1", numberFormat: "@" }, { value: 2, numberFormat: "General" }],
    ],
    columnFormats: ["@", "General"],
  };
  it("produces header + data rows with aligned formats", () => {
    const { values, formats } = buildSheetArrays(model);
    expect(values[0]).toEqual(["a", "b"]);
    expect(values[1]).toEqual(["1", 2]);
    expect(formats.length).toBe(2);
  });
});
