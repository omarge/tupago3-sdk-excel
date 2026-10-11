import type { WorksheetModel } from "../models/types.js";
import { buildSheetArrays, resolveTarget, RangeOccupiedError, type SheetPlan } from "./excelOps.js";

export interface ImportOptions {
  preferNewSheet?: boolean; // default true (no overwrite by default)
  confirmOverwrite?: boolean;
  baseName?: string;
}

function isEffectivelyEmpty(range: Excel.Range | Excel.Range | null): boolean {
  if (!range) return true;
  const rowCount = (range as any).rowCount as number;
  const colCount = (range as any).columnCount as number;
  if (rowCount === 0 || colCount === 0) return true;
  if (rowCount === 1 && colCount === 1) {
    const v = (range as any).values?.[0]?.[0];
    return v === null || v === undefined || v === "";
  }
  return false;
}

/**
 * Write a WorksheetModel into the active workbook safely.
 * - By default creates a dedicated new sheet (never overwrites user data).
 * - Overwrites only when confirmOverwrite is explicitly set AND the sheet is not
 *   a managed TuPago3 sheet (gate G5 / T24).
 */
export async function importModel(model: WorksheetModel, options: ImportOptions = {}): Promise<{ sheetName: string; plan: SheetPlan }> {
  return Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    const active = sheets.getActiveWorksheet();

    const used = active.getUsedRangeOrNullObject();
    used.load("rowCount");
    used.load("columnCount");
    used.load("values");
    await context.sync();

    const activeExists = true; // getActiveWorksheet always returns one
    const activeIsEmpty = isEffectivelyEmpty(used as unknown as Excel.Range);
    const activeIsManaged = active.name.startsWith("TuPago3_");

    let plan: SheetPlan;
    try {
      plan = resolveTarget({
        activeSheetName: active.name,
        activeSheetExists: activeExists,
        activeSheetIsEmpty: activeIsEmpty,
        activeSheetIsManaged: activeIsManaged,
        confirmOverwrite: !!options.confirmOverwrite,
        preferNewSheet: options.preferNewSheet !== false,
        baseName: options.baseName ?? model.name,
      });
    } catch (e) {
      if (e instanceof RangeOccupiedError) throw e;
      throw e;
    }

    let target: Excel.Worksheet;
    if (plan.action === "create-new") {
      target = sheets.add(plan.targetSheetName);
    } else {
      target = active;
    }

    const { values, formats } = buildSheetArrays(model);
    const range = target.getRangeByIndexes(0, 0, values.length, values[0].length);
    range.values = values as any;
    range.numberFormat = formats as any;
    await context.sync();

    const tableRange = target.getRangeByIndexes(0, 0, values.length, values[0].length);
    const table = target.tables.add(tableRange.getAddress(), true);
    table.getHeaderRowRange().format.font.bold = true;
    table.name = model.name.replace(/[^A-Za-z0-9_]/g, "_");
    await context.sync();

    return { sheetName: target.name, plan };
  });
}

/** Read the active selection address for UI display / "refresh from selection". */
export async function getActiveSelectionInfo(): Promise<{ address: string; rowCount: number; columnCount: number } | null> {
  return Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.load("address");
    range.load("rowCount");
    range.load("columnCount");
    await context.sync();
    return { address: (range as any).address, rowCount: (range as any).rowCount, columnCount: (range as any).columnCount };
  });
}
