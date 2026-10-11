import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { importModel } from "../../src/excel/officeBridge.js";
import { RangeOccupiedError } from "../../src/excel/excelOps.js";
import type { WorksheetModel } from "../../src/models/types.js";

interface MockState {
  added: string[];
  writeValues: unknown[][][];
  tableName: string | null;
  headerBold: boolean;
  activeName: string;
  used: { rowCount: number; columnCount: number; values: unknown[][] } | null;
  reusedActive: boolean;
}

function makeMockExcel(state: MockState) {
  const active = {
    get name() {
      return state.activeName;
    },
    getRangeByIndexes: () => rangeFactory(),
    tables: {
      add: (_addr: string, _hdr: boolean) => {
        state.tableName = "T";
        return {
          getHeaderRowRange: () => ({ format: { font: { set bold(b: boolean) { state.headerBold = b; } } } }),
          set name(_n: string) {},
        };
      },
    },
    getUsedRangeOrNullObject() {
      if (!state.used) return { isNullObject: true, load() {}, rowCount: 0, columnCount: 0, values: [[]] };
      return { isNullObject: false, load() {}, rowCount: state.used!.rowCount, columnCount: state.used!.columnCount, values: state.used!.values };
    },
  };
  const rangeFactory = () => {
    let v: unknown[][] = [];
    let f: unknown[][] = [];
    return {
      set values(x: unknown[][]) {
        v = x;
        state.writeValues.push(x);
      },
      get values() {
        return v;
      },
      set numberFormat(x: unknown[][]) {
        f = x;
      },
      get numberFormat() {
        return f;
      },
      getAddress: () => "A1",
    };
  };
  const target = {
    name: "",
    getRangeByIndexes: () => rangeFactory(),
    tables: {
      add: (_addr: string, _hdr: boolean) => {
        state.tableName = "T";
        return {
          getHeaderRowRange: () => ({ format: { font: { set bold(b: boolean) { state.headerBold = b; } } } }),
          set name(_n: string) {},
        };
      },
    },
  };
  const excel = {
    run(cb: (ctx: any) => Promise<any>) {
      const context = {
        sync: async () => {},
        workbook: {
          worksheets: {
            getActiveWorksheet: () => active,
            add: (name: string) => {
              target.name = name;
              state.added.push(name);
              state.reusedActive = false;
              return target;
            },
          },
        },
      };
      return cb(context);
    },
  };
  return excel;
}

const model: WorksheetModel = {
  name: "TuPago3_Cliente",
  headers: ["id", "nombre"],
  rows: [[{ value: "1", numberFormat: "@" }, { value: "Demo", numberFormat: "@" }]],
  columnFormats: ["@", "@"],
};

describe("Office bridge (T17 Import, T18 Table, T19 Refresh, T24 Protection)", () => {
  let state: MockState;
  beforeEach(() => {
    state = { added: [], writeValues: [], tableName: null, headerBold: false, activeName: "Hoja1", used: null, reusedActive: true };
    (globalThis as any).Excel = makeMockExcel(state);
  });
  afterEach(() => {
    delete (globalThis as any).Excel;
  });

  it("T17/T18 creates a new sheet, writes values and adds a structured table with bold header", async () => {
    const r = await importModel(model, { preferNewSheet: true });
    expect(r.plan.action).toBe("create-new");
    expect(state.added.length).toBe(1);
    expect(state.writeValues.length).toBeGreaterThanOrEqual(1);
    expect(state.tableName).not.toBeNull();
    expect(state.headerBold).toBe(true);
    // values include header row
    expect(state.writeValues[0][0]).toEqual(["id", "nombre"]);
  });

  it("T19 refreshes the active managed sheet instead of creating a new one", async () => {
    state.activeName = "TuPago3_Cliente";
    state.used = { rowCount: 2, columnCount: 2, values: [["id", "nombre"], ["1", "x"]] };
    state.reusedActive = true;
    const r = await importModel(model, { preferNewSheet: false });
    expect(r.plan.action).toBe("refresh-active");
    expect(state.added.length).toBe(0);
  });

  it("T24 refuses to overwrite an occupied, non-managed sheet without confirmation", async () => {
    state.used = { rowCount: 3, columnCount: 2, values: [["a", "b"], ["c", "d"], ["e", "f"]] };
    await expect(importModel(model, { preferNewSheet: false, confirmOverwrite: false })).rejects.toBeInstanceOf(RangeOccupiedError);
    expect(state.writeValues.length).toBe(0);
  });
});
