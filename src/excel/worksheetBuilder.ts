import type { Cell, ClientePerfil, CatalogoInstitucion, ColumnDef, StatusResult, WorksheetModel } from "../models/types.js";
import { escapeFormulaText, toDateCell, toMonetaryCell, toSafeCellText } from "../security/sanitize.js";

const TEXT_FORMAT = "@"; // Excel text format: prevents number coercion & formula interpretation.

function renderCell(col: ColumnDef, raw: unknown): Cell {
  switch (col.type) {
    case "int64": {
      // Never Number(): preserve full precision. Render as text.
      if (raw === null || raw === undefined) return { value: "", numberFormat: TEXT_FORMAT };
      return { value: typeof raw === "bigint" ? raw.toString() : String(raw), numberFormat: TEXT_FORMAT };
    }
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw));
      if (!Number.isFinite(n)) return { value: toSafeCellText(raw), numberFormat: TEXT_FORMAT };
      return { value: n, numberFormat: "General" };
    }
    case "money": {
      const m = toMonetaryCell(raw);
      if (!m) return { value: toSafeCellText(raw), numberFormat: TEXT_FORMAT };
      return { value: m.value, numberFormat: m.numberFormat };
    }
    case "date": {
      const d = toDateCell(raw);
      return { value: d.value, numberFormat: d.numberFormat };
    }
    case "json": {
      const s = typeof raw === "string" ? raw : JSON.stringify(raw);
      return { value: escapeFormulaText(s ?? ""), numberFormat: TEXT_FORMAT };
    }
    case "text":
    default: {
      const safe = toSafeCellText(raw);
      return { value: safe, numberFormat: TEXT_FORMAT };
    }
  }
}

function buildModel(name: string, columns: ColumnDef[], rows: Record<string, unknown>[]): WorksheetModel {
  const headers = columns.map((c) => c.header);
  const columnFormats = columns.map((c) => (c.type === "text" || c.type === "int64" || c.type === "json" ? TEXT_FORMAT : "General"));
  const data = rows.map((r) => columns.map((c) => renderCell(c, r[c.header])));
  return { name, headers, rows: data, columnFormats };
}

const CLIENTE_COLUMNS: ColumnDef[] = [
  { header: "id", type: "int64" },
  { header: "nombre", type: "text" },
  { header: "claveInstitucion", type: "text", preserveLeadingZeros: true },
  { header: "key", type: "text", preserveLeadingZeros: true },
  { header: "catalogo.id", type: "int64" },
  { header: "catalogo.claveInstitucion", type: "text", preserveLeadingZeros: true },
  { header: "catalogo.nombreCorto", type: "text" },
];

const CATALOGO_COLUMNS: ColumnDef[] = [
  { header: "id", type: "int64" },
  { header: "claveInstitucion", type: "text", preserveLeadingZeros: true },
  { header: "nombreCorto", type: "text" },
];

export function buildClienteModel(profile: ClientePerfil): WorksheetModel {
  const row: Record<string, unknown> = {
    id: profile.cliente?.id ?? null,
    nombre: profile.cliente?.nombre ?? null,
    claveInstitucion: profile.cliente?.claveInstitucion ?? null,
    key: profile.cliente?.key ?? null,
    "catalogo.id": profile.catalogoInstitucion?.id ?? null,
    "catalogo.claveInstitucion": profile.catalogoInstitucion?.claveInstitucion ?? null,
    "catalogo.nombreCorto": profile.catalogoInstitucion?.nombreCorto ?? null,
  };
  return buildModel("TuPago3_Cliente", CLIENTE_COLUMNS, [row]);
}

export function buildCatalogoModel(catalogo: CatalogoInstitucion): WorksheetModel {
  const row: Record<string, unknown> = {
    id: catalogo.id,
    claveInstitucion: catalogo.claveInstitucion,
    nombreCorto: catalogo.nombreCorto,
  };
  return buildModel("TuPago3_Catalogo", CATALOGO_COLUMNS, [row]);
}

function classifyValue(header: string, raw: unknown): Cell {
  const h = header.toLowerCase();
  if (/(monto|importe|amount|total|saldo|amount)/.test(h)) {
    const m = toMonetaryCell(raw);
    if (m) return { value: m.value, numberFormat: m.numberFormat };
  }
  if (/(fecha|date|timestamp|hora)/.test(h)) {
    const d = toDateCell(raw);
    return { value: d.value, numberFormat: d.numberFormat };
  }
  return { value: toSafeCellText(raw), numberFormat: TEXT_FORMAT };
}

// Flatten an untrusted JSON status payload into a safe key/value worksheet model.
// Bounded recursion prevents pathological/oversized payloads.
export function buildStatusModel(kind: "qrStatus" | "telefonicoStatus", result: StatusResult): WorksheetModel {
  let parsed: unknown = null;
  try {
    parsed = result.json ? JSON.parse(result.json) : null;
  } catch {
    parsed = null;
  }
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const flatten = (obj: unknown, prefix: string, depth: number): void => {
    if (depth > 4 || rows.length > 1000) return;
    if (obj === null || obj === undefined) {
      if (!seen.has(prefix)) {
        seen.add(prefix);
        rows.push({ campo: prefix || "(raiz)", valor: null });
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.slice(0, 50).forEach((item, i) => flatten(item, `${prefix}[${i}]`, depth + 1));
      return;
    }
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        flatten(v, prefix ? `${prefix}.${k}` : k, depth + 1);
      }
      return;
    }
    if (!seen.has(prefix)) {
      seen.add(prefix);
      rows.push({ campo: prefix, valor: obj });
    }
  };
  flatten(parsed, "", 0);
  if (rows.length === 0) rows.push({ campo: "(sin datos)", valor: null });

  const headers = ["campo", "valor"];
  const columnFormats = [TEXT_FORMAT, TEXT_FORMAT];
  const data = rows.map((r) => [
    { value: toSafeCellText(r.campo), numberFormat: TEXT_FORMAT },
    classifyValue(String(r.campo ?? ""), r.valor),
  ]);
  return { name: kind === "qrStatus" ? "TuPago3_QR" : "TuPago3_Telefonico", headers, rows: data, columnFormats };
}
