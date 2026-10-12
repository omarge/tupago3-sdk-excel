import { TupagoApiError, type CatalogoInstitucion, type ClientePerfil, type StatusResult } from "../models/types.js";
import { isAuthorizedOrigin, normalizeOrigin, DEV_LOCALHOST_ORIGINS, type GatewayOriginPolicy } from "../config/gatewayOrigin.js";

export interface ApiConfig {
  baseUrl: string;
}

// The add-in talks ONLY to its own BFF gateway over HTTPS. Never to backend3 directly.
export class TupagoApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string | null,
    // Defense-in-depth: when a policy is supplied the base URL must be an authorized origin.
    // Omitting it (legacy/unit tests) defaults to the development localhost allow-list.
    policy?: GatewayOriginPolicy,
  ) {
    const effective = policy ?? { allowedOrigins: [...DEV_LOCALHOST_ORIGINS], devMode: true };
    this.assertAuthorizedOrigin(baseUrl, effective);
  }

  // Gate R3: the add-in sends credentials/JWT ONLY to an explicitly authorized gateway
  // origin (canonical scheme://host:port). Arbitrary HTTPS endpoints, even with valid certs,
  // are rejected; localhost is permitted only under the dev allow-list.
  private assertAuthorizedOrigin(url: string, policy: GatewayOriginPolicy): void {
    if (normalizeOrigin(url) === null) {
      throw new Error(`Origen de gateway inválido rechazado por seguridad: "${url}".`);
    }
    if (!isAuthorizedOrigin(url, policy)) {
      throw new Error(`Origen de gateway NO AUTORIZADO rechazado por seguridad: "${url}".`);
    }
  }

  // Redirects are never followed for login or Bearer requests: a redirect to another origin
  // would leak credentials/JWT to that origin. We fail closed instead.
  private assertNoRedirect(status: number): void {
    if (status >= 300 && status < 400) {
      throw new TupagoApiError("UNAVAILABLE", "Redirección rechazada por seguridad (posible fuga de credenciales/JWT).");
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (init?.body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        // Never follow redirects: a cross-origin redirect would leak the Bearer token.
        redirect: "manual",
        // Guard against hanging requests (maps to DEADLINE_EXCEEDED in caller layer).
        signal: init?.signal,
      });
    } catch (e) {
      throw new TupagoApiError("UNAVAILABLE", `No se pudo conectar con el gateway: ${describe(e)}`);
    }

    this.assertNoRedirect(res.status);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const body = text ? safeJson(text) : undefined;

    if (res.ok) return body as T;

    throw mapHttpError(res.status, body);
  }

  async login(username: string, password: string): Promise<{ token: string; expiresAt: number; login: string; roles: string[] }> {
    const res = await fetch(`${this.baseUrl}/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
      // Never follow redirects: a cross-origin redirect would leak the credentials.
      redirect: "manual",
    });
    // Fail closed on any redirect (credentials must never be re-sent to another origin).
    if (res.status >= 300 && res.status < 400) {
      throw new TupagoApiError("UNAVAILABLE", "Redirección en login rechazada por seguridad.");
    }
    const text = await res.text();
    const body = text ? safeJson(text) : undefined;
    if (!res.ok) throw mapHttpError(res.status, body);
    return body as { token: string; expiresAt: number; login: string; roles: string[] };
  }

  async getCliente(id: string, signal?: AbortSignal): Promise<ClientePerfil> {
    return this.request<ClientePerfil>(`/v1/cliente/${encodeURIComponent(id)}`, { signal });
  }

  async getCatalogo(claveInstitucion: string, signal?: AbortSignal): Promise<CatalogoInstitucion> {
    return this.request<CatalogoInstitucion>(`/v1/catalogo/${encodeURIComponent(claveInstitucion)}`, { signal });
  }

  async getQrStatus(idc: string, idCuenta: string, signal?: AbortSignal): Promise<StatusResult> {
    const q = new URLSearchParams({ idc, idCuenta });
    return this.request<StatusResult>(`/v1/qr-status?${q.toString()}`, { signal });
  }

  async getTelefonicoStatus(idc: string, idCuenta: string, signal?: AbortSignal): Promise<StatusResult> {
    const q = new URLSearchParams({ idc, idCuenta });
    return this.request<StatusResult>(`/v1/telefonico-status?${q.toString()}`, { signal });
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function mapHttpError(status: number, body: unknown): TupagoApiError {
  const msg = (body && typeof body === "object" && "message" in body ? String((body as any).message) : JSON.stringify(body)) || `HTTP ${status}`;
  switch (status) {
    case 400:
    case 422:
      return new TupagoApiError("INVALID_ARGUMENT", msg, status);
    case 401:
      return new TupagoApiError("UNAUTHENTICATED", msg, status);
    case 403:
      return new TupagoApiError("PERMISSION_DENIED", msg, status);
    case 404:
      return new TupagoApiError("NOT_FOUND", msg, status);
    case 408:
    case 504:
      return new TupagoApiError("DEADLINE_EXCEEDED", msg, status);
    case 502:
    case 503:
      return new TupagoApiError("UNAVAILABLE", msg, status);
    default:
      return new TupagoApiError("UNKNOWN", msg, status);
  }
}
