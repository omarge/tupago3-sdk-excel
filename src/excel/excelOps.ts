import type { WorksheetModel } from "../models/types.js";

// ---- Pure, testable core ---------------------------------------------------

export interface SheetPlan {
  action: "create-new" | "overwrite-active" | "refresh-active";
  targetSheetName: string;
}

export class RangeOccupiedError extends Error {
  constructor(public readonly sheetName: string) {
    super(
      `La hoja "${sheetName}" ya contiene datos. No se sobrescribió. ` +
        `Use una hoja nueva o confirme la sobreescritura explícitamente.`,
    );
    this.name = "RangeOccupiedError";
  }
}

export interface ResolveTargetInput {
  activeSheetName: string;
  activeSheetExists: boolean;
  activeSheetIsEmpty: boolean;
  activeSheetIsManaged: boolean;
  confirmOverwrite: boolean;
  preferNewSheet: boolean;
  baseName: string;
}

/**
 * Decides where to write. Enforces "no overwrite without protection" (gate G5 / T24):
 * an existing, non-empty, non-managed sheet is NEVER overwritten unless the caller
 * explicitly passes confirmOverwrite. By default we create a dedicated new sheet.
 */
export function resolveTarget(input: ResolveTargetInput): SheetPlan {
  const { activeSheetName, activeSheetExists, activeSheetIsEmpty, activeSheetIsManaged, confirmOverwrite, preferNewSheet, baseName } =
    input;

  if (preferNewSheet || !activeSheetExists) {
    return { action: "create-new", targetSheetName: uniqueSheetName(baseName) };
  }
  if (activeSheetIsEmpty || activeSheetIsManaged) {
    return { action: "refresh-active", targetSheetName: activeSheetName };
  }
  if (confirmOverwrite) {
    return { action: "overwrite-active", targetSheetName: activeSheetName };
  }
  throw new RangeOccupiedError(activeSheetName);
}

function uniqueSheetName(base: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${base}_${stamp}`;
}

/**
 * Materialize a WorksheetModel into the exact 2D arrays Excel expects.
 * Values are already neutralized (formula-escaped, int64 as text, money as numbers).
 */
export function buildSheetArrays(model: WorksheetModel): { values: (string | number | null)[][]; formats: string[][] } {
  const headerRow: (string | number | null)[] = model.headers;
  const values: (string | number | null)[][] = [headerRow, ...model.rows.map((r) => r.map((c) => c.value))];
  const formats: string[][] = [
    model.columnFormats,
    ...model.rows.map(() => model.columnFormats),
  ];
  return { values, formats };
}
