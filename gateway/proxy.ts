// Thin wrapper around the official TuPago3 TypeScript SDK (gRPC). Exposes ONLY the four
// read-only operations. Create operations are intentionally absent (gate G4 / T29).
import {
  TupagoPaymentClient,
  TupagoException,
  type CatalogoInstitucion,
  type ClientePerfil,
  type JsonResponseView,
} from "@tupago/tupago3-sdk-typescript";

export class GatewayError extends Error {
  constructor(
    public readonly status: number,
    public readonly kind: string,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

function mapError(e: unknown): GatewayError {
  // Preserve already-constructed gateway errors (e.g. from parseBigInt/input validation) so
  // their status codes (400 INVALID_ARGUMENT, etc.) are not silently downgraded to 502.
  if (e instanceof GatewayError) return e;
  if (e instanceof TupagoException) {
    const code = typeof e.code === "number" ? e.code : 2;
    switch (code) {
      case 16:
        return new GatewayError(401, "UNAUTHENTICATED", "No autenticado: token ausente o inválido.");
      case 7:
        return new GatewayError(403, "PERMISSION_DENIED", "Sin permiso para este recurso.");
      case 5:
        return new GatewayError(404, "NOT_FOUND", "Recurso no encontrado.");
      case 3:
        return new GatewayError(400, "INVALID_ARGUMENT", "Argumento inválido.");
      case 4:
        return new GatewayError(504, "DEADLINE_EXCEEDED", "Tiempo de espera agotado.");
      case 14:
        return new GatewayError(503, "UNAVAILABLE", "Servicio no disponible.");
      case 10:
        return new GatewayError(409, "ABORTED", "Estado indeterminado; consulte el estatus en lugar de reintentar.");
      default:
        return new GatewayError(500, "UNKNOWN", "Error desconocido del servicio.");
    }
  }
  return new GatewayError(502, "UNAVAILABLE", e instanceof Error ? e.message : "Error de transporte.");
}

function parseBigInt(field: string, value: string): bigint {
  if (!/^-?\d+$/.test(value.trim())) {
    throw new GatewayError(400, "INVALID_ARGUMENT", `El campo '${field}' debe ser un entero (int64) válido.`);
  }
  return BigInt(value.trim());
}

export interface TupagoProxy {
  getCliente(id: string, token: string, signal?: AbortSignal): Promise<ClientePerfil>;
  getCatalogo(claveInstitucion: string, token: string, signal?: AbortSignal): Promise<CatalogoInstitucion>;
  getQrStatus(idc: string, idCuenta: string, token: string, signal?: AbortSignal): Promise<JsonResponseView>;
  getTelefonicoStatus(idc: string, idCuenta: string, token: string, signal?: AbortSignal): Promise<JsonResponseView>;
}

// The proxy creates a short-lived gRPC client per request, injecting the caller's JWT via the
// CredentialProvider. backend3 revalidates the token and ownership (defense in depth).
export function createProxy(target: string, deadlineMillis: number): TupagoProxy {
  function withClient<T>(token: string, fn: (c: TupagoPaymentClient) => Promise<T>): Promise<T> {
    const client = new TupagoPaymentClient({
      target,
      credentials: { token: () => token },
      deadlineMillis,
    });
    return fn(client).finally(() => client.close());
  }

  return {
    async getCliente(id, token, signal) {
      try {
        return await withClient(token, (c) => c.getCliente(parseBigInt("id", id), { signal }));
      } catch (e) {
        throw mapError(e);
      }
    },
    async getCatalogo(claveInstitucion, token, signal) {
      try {
        return await withClient(token, (c) => c.getCatalogo(claveInstitucion ?? "", { signal }));
      } catch (e) {
        throw mapError(e);
      }
    },
    async getQrStatus(idc, idCuenta, token, signal) {
      try {
        return await withClient(token, (c) => c.getQrStatus(idc ?? "", parseBigInt("idCuenta", idCuenta), { signal }));
      } catch (e) {
        throw mapError(e);
      }
    },
    async getTelefonicoStatus(idc, idCuenta, token, signal) {
      try {
        return await withClient(token, (c) => c.getTelefonicoStatus(idc ?? "", parseBigInt("idCuenta", idCuenta), { signal }));
      } catch (e) {
        throw mapError(e);
      }
    },
  };
}
