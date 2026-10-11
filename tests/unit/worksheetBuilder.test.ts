import { describe, it, expect } from "vitest";
import { buildClienteModel, buildCatalogoModel, buildStatusModel } from "../../src/excel/worksheetBuilder.js";
import type { ClientePerfil, CatalogoInstitucion, StatusResult } from "../../src/models/types.js";

// T17 — Import result to a worksheet structure
// T18 — Structured table (headers + rows)
describe("T17 ImportToWorksheet / T18 CreateTable", () => {
  const perfil: ClientePerfil = {
    cliente: { id: "9223372036854775807", nombre: "Banco Demo", claveInstitucion: "00301", key: "k-1" },
    catalogoInstitucion: { id: "7", claveInstitucion: "00301", nombreCorto: "MEMBER_A" },
  };
  const model = buildClienteModel(perfil);
  it("produces a header row and one data row", () => {
    expect(model.headers.length).toBeGreaterThan(0);
    expect(model.rows.length).toBe(1);
    expect(model.headers).toContain("id");
    expect(model.headers).toContain("claveInstitucion");
  });
  it("header count matches column format count (table-ready)", () => {
    expect(model.rows[0].length).toBe(model.headers.length);
    expect(model.columnFormats.length).toBe(model.headers.length);
  });
});

// T20 — Preserve leading zeros
describe("T20 PreserveLeadingZeros", () => {
  it("keeps zero-padded clave as text and as-is", () => {
    const cat: CatalogoInstitucion = { id: "1", claveInstitucion: "00301", nombreCorto: "MEMBER_A" };
    const model = buildCatalogoModel(cat);
    const claveIdx = model.headers.indexOf("claveInstitucion");
    const cell = model.rows[0][claveIdx];
    expect(cell.value).toBe("00301");
    expect(cell.numberFormat).toBe("@");
  });
});

// T21 — Preserve int64 (string, not number)
describe("T21 PreserveInt64 (model)", () => {
  it("renders max int64 as text, not a number", () => {
    const perfil: ClientePerfil = {
      cliente: { id: "9223372036854775807", nombre: "x", claveInstitucion: "001", key: "k" },
      catalogoInstitucion: null,
    };
    const model = buildClienteModel(perfil);
    const idCell = model.rows[0][model.headers.indexOf("id")];
    expect(idCell.value).toBe("9223372036854775807");
    expect(typeof idCell.value).toBe("string");
  });
});

// T22 — Monetary formatting carried into the worksheet model
describe("T22 MonetaryFormatting (model)", () => {
  it("applies a currency number format to monetary fields in status payloads", () => {
    const status: StatusResult = { json: JSON.stringify({ monto: "$1,250.75", fecha: "2026-05-01T00:00:00Z" }) };
    const model = buildStatusModel("qrStatus", status);
    const montoRow = model.rows.find((r) => r[0].value === "monto");
    expect(montoRow).toBeDefined();
    expect(montoRow![1].numberFormat).toContain("$");
    const fechaRow = model.rows.find((r) => r[0].value === "fecha");
    expect(fechaRow![1].numberFormat).toBe("yyyy-mm-dd");
  });
});

// T23 — Formula injection prevention in worksheet cells
describe("T23 FormulaInjectionPrevention (model)", () => {
  it("escapes provider values that begin with formula triggers", () => {
    const status: StatusResult = { json: JSON.stringify({ nota: "=cmd|'/c calc'!A0", ref: "@evil" }) };
    const model = buildStatusModel("qrStatus", status);
    const nota = model.rows.find((r) => r[0].value === "nota");
    expect(nota![1].value).toBe("'=cmd|'/c calc'!A0");
    const ref = model.rows.find((r) => r[0].value === "ref");
    expect(ref![1].value).toBe("'@evil");
  });
  it("never emits a bare formula-leading value", () => {
    const status: StatusResult = { json: JSON.stringify({ x: "=SUM(A1:A2)" }) };
    const model = buildStatusModel("qrStatus", status);
    const x = model.rows.find((r) => r[0].value === "x");
    expect(String(x![1].value).startsWith("'")).toBe(true);
  });
});

// T19 — Refresh results: re-building the model yields current data (idempotent regeneration)
describe("T19 RefreshResults", () => {
  it("regenerates the same shape for refreshed data", () => {
    const a = buildCatalogoModel({ id: "1", claveInstitucion: "001", nombreCorto: "A" });
    const b = buildCatalogoModel({ id: "1", claveInstitucion: "001", nombreCorto: "A" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
