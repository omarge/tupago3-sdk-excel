// Domain types mirroring the authoritative TuPago3 contract (payment.proto @ backend3).
// int64 fields are represented as strings end-to-end to avoid JavaScript Number precision loss.

export interface Cliente {
  id: string;
  nombre: string | null;
  claveInstitucion: string | null;
  key: string | null;
}

export interface CatalogoInstitucion {
  id: string;
  claveInstitucion: string;
  nombreCorto: string;
}

export interface ClientePerfil {
  cliente: Cliente | null;
  catalogoInstitucion: CatalogoInstitucion | null;
}

// Raw Banxico status payload (JsonResponse.json). Treated as untrusted data.
export interface StatusResult {
  json: string;
}

export type OperationKind = "cliente" | "catalogo" | "qrStatus" | "telefonicoStatus";

// Column typing drives safe Excel rendering (int64 precision, leading zeros, money, dates).
export type ColumnType = "text" | "int64" | "number" | "money" | "date" | "json";

export interface ColumnDef {
  header: string;
  type: ColumnType;
  // When true, leading zeros / zero-padding are preserved by writing as text.
  preserveLeadingZeros?: boolean;
}

export interface Cell {
  value: string | number | null;
  // Excel number format applied to the cell/column (e.g. "@" for text, currency, date).
  numberFormat?: string;
}

export interface WorksheetModel {
  name: string;
  headers: string[];
  rows: Cell[][];
  // Per-column number format aligned with `headers` length.
  columnFormats: string[];
}

export interface SessionIdentity {
  login: string;
  roles: string[];
  expiresAt: number;
}

export class TupagoApiError extends Error {
  constructor(
    public readonly kind:
      | "NOT_FOUND"
      | "UNAUTHENTICATED"
      | "PERMISSION_DENIED"
      | "INVALID_ARGUMENT"
      | "DEADLINE_EXCEEDED"
      | "UNAVAILABLE"
      | "UNKNOWN",
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TupagoApiError";
  }
}
