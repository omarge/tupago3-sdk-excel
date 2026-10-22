import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp, collectRoutes, assertSafeIdentifier, type AppDeps } from "../../gateway/app.js";
import { backend3Authenticate, validateProductionConfig } from "../../gateway/server.js";
import { createProxy } from "../../gateway/proxy.js";
import type { GatewayConfig } from "../../gateway/config.js";

const config: GatewayConfig = {
  port: 0,
  grpcTarget: "127.0.0.1:9090",
  backend3AuthUrl: "http://localhost:8091/api/authenticate",
  corsOrigins: ["https://trusted.test", "https://localhost:8443"],
  enableTls: false,
  allowInsecure: true,
  rateLimitMax: 1000,
  rateLimitWindowMs: 60000,
  loginRateLimitMax: 3,
  loginRateLimitWindowMs: 60000,
  requestTimeoutMs: 5000,
  maxBodyBytes: 16384,
};

const authOk = { token: "jwt", expiresAt: Date.now() + 1000, login: "u", roles: ["ROLE_USER"] };

function makeToken(expSecondsFromNow = 3600): string {
  const h = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "lab", exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })).toString("base64url");
  return `${h}.${p}.signature`;
}
function auth(token = makeToken()) {
  return { Authorization: `Bearer ${token}` };
}

const readProxy: any = {
  async getCliente() { return { cliente: { id: "1", nombre: "Demo", claveInstitucion: "301", key: "k" }, catalogoInstitucion: { id: "2", claveInstitucion: "301", nombreCorto: "MEMBER_A" } }; },
  async getCatalogo() { return { id: "2", claveInstitucion: "301", nombreCorto: "MEMBER_A" }; },
  async getQrStatus() { return { json: () => '{"idCuenta":"123","status":"PAGADO"}' } as any; },
  async getTelefonicoStatus() { return { json: () => '{"idCuenta":"123","status":"PENDIENTE"}' } as any; },
};

let base: string;
let server: import("node:http").Server;

beforeAll(async () => {
  const deps: AppDeps = { proxy: readProxy, authenticate: async () => authOk };
  const app = createApp(config, deps);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

// T32 — Dedicated login rate limit (G3: login abuse protection)
describe("T32 LoginRateLimit", () => {
  it("returns 429 after exceeding the dedicated login limit", async () => {
    let saw429 = false;
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${base}/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "x", password: "y" }),
      });
      if (r.status === 429) saw429 = true;
    }
    expect(saw429).toBe(true);
  });
});

// T33 — Strict input validation on identifier parameters (G3)
describe("T33 InputValidation", () => {
  it("rejects catalogo with non-allowed characters (400, not forwarded)", async () => {
    const r = await fetch(`${base}/v1/catalogo/..%2fetc`, { headers: auth() });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("INVALID_ARGUMENT");
  });
  it("rejects catalogo with spaces (400)", async () => {
    const r = await fetch(`${base}/v1/catalogo/30 1`, { headers: auth() });
    expect(r.status).toBe(400);
  });
  it("rejects qr-status with malicious idc (400)", async () => {
    const r = await fetch(`${base}/v1/qr-status?idc=%3Bdrop&idCuenta=123`, { headers: auth() });
    expect(r.status).toBe(400);
  });
  it("accepts a valid clave and reaches the proxy (200)", async () => {
    const r = await fetch(`${base}/v1/catalogo/301`, { headers: auth() });
    expect(r.status).toBe(200);
  });
});

// T28b — CORS allow-list never replaces authentication (G3)
describe("T28b CorsNotAuth", () => {
  it("trusted Origin without token is still 401", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: { Origin: "https://trusted.test" } });
    expect(r.status).toBe(401);
  });
});

// T29 — No Create endpoints (re-confirm after edits)
describe("T29 NoCreateEndpoints", () => {
  it("exposes only read/health/login routes", () => {
    const app = createApp(config, { proxy: readProxy, authenticate: async () => authOk });
    const routes = collectRoutes(app);
    const dangerous = routes.filter(
      (r) => r.method === "POST" || r.method === "PUT" || r.method === "DELETE" || /create|mutat/i.test(r.path),
    );
    expect(dangerous.every((r) => r.path === "/v1/login")).toBe(true);
  });
});

// T34 — Production config guard (G3: dev config cannot ship as prod)
describe("T34 ProductionConfigGuard", () => {
  const prev = {
    nodeEnv: process.env.NODE_ENV,
    tlsCert: process.env.GATEWAY_TLS_CERT,
    tlsKey: process.env.GATEWAY_TLS_KEY,
  };
  afterEach(() => {
    if (prev.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev.nodeEnv;
    if (prev.tlsCert === undefined) delete process.env.GATEWAY_TLS_CERT;
    else process.env.GATEWAY_TLS_CERT = prev.tlsCert;
    if (prev.tlsKey === undefined) delete process.env.GATEWAY_TLS_KEY;
    else process.env.GATEWAY_TLS_KEY = prev.tlsKey;
    vi.unstubAllGlobals();
  });

  it("allows non-production config", () => {
    process.env.NODE_ENV = "development";
    expect(() => validateProductionConfig({ ...config, enableTls: false, allowInsecure: true })).not.toThrow();
  });
  it("refuses production without TLS", () => {
    process.env.NODE_ENV = "production";
    expect(() => validateProductionConfig({ ...config, enableTls: false, allowInsecure: false })).toThrow(/GATEWAY_TLS/);
  });
  it("refuses production with allow-insecure flag", () => {
    process.env.NODE_ENV = "production";
    expect(() => validateProductionConfig({ ...config, enableTls: true, allowInsecure: true })).toThrow(/ALLOW_INSECURE/);
  });
  it("refuses production without a trusted CA certificate", () => {
    process.env.NODE_ENV = "production";
    delete process.env.GATEWAY_TLS_CERT;
    delete process.env.GATEWAY_TLS_KEY;
    expect(() => validateProductionConfig({ ...config, enableTls: true, allowInsecure: false })).toThrow(/GATEWAY_TLS_CERT/);
  });
  it("refuses production when the upstream authentication URL uses HTTP", () => {
    process.env.NODE_ENV = "production";
    process.env.GATEWAY_TLS_CERT = "/etc/tupago/gateway/fullchain.pem";
    process.env.GATEWAY_TLS_KEY = "/etc/tupago/gateway/privkey.pem";
    expect(() =>
      validateProductionConfig({
        ...config,
        backend3AuthUrl: "http://auth.example.test/api/authenticate",
        enableTls: true,
        allowInsecure: false,
      }),
    ).toThrow(/BACKEND3_AUTH_URL.*HTTPS/);
  });
  it("allows production with TLS, no insecure flag and a trusted CA certificate", () => {
    process.env.NODE_ENV = "production";
    process.env.GATEWAY_TLS_CERT = "/etc/tupago/gateway/fullchain.pem";
    process.env.GATEWAY_TLS_KEY = "/etc/tupago/gateway/privkey.pem";
    expect(() =>
      validateProductionConfig({
        ...config,
        backend3AuthUrl: "https://auth.example.test/api/authenticate",
        enableTls: true,
        allowInsecure: false,
      }),
    ).not.toThrow();
  });
  it("does not follow an upstream authentication redirect", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: false,
      status: 307,
      text: async () => "",
    } as unknown as Response));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      backend3Authenticate("https://auth.example.test/api/authenticate", "user", "password"),
    ).rejects.toThrow("auth redirect rejected");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://auth.example.test/api/authenticate",
      expect.objectContaining({ redirect: "manual" }),
    );
  });
});

// T35 — assertSafeIdentifier unit (G3)
describe("T35 AssertSafeIdentifier", () => {
  it("accepts alphanumeric", () => {
    expect(assertSafeIdentifier("x", "301")).toBe("301");
  });
  it("rejects path traversal and spaces", () => {
    expect(() => assertSafeIdentifier("x", "../a")).toThrow();
    expect(() => assertSafeIdentifier("x", "a b")).toThrow();
  });
});

// T36 — Invalid numeric identifier returns 400 (not 502). parseBigInt throws a GatewayError
// inside the proxy; mapError must preserve it instead of downgrading to UNAVAILABLE. (G2.9 / G3)
describe("T36 InvalidIdPreserves400", () => {
  let base2: string;
  let server2: import("node:http").Server;
  beforeAll(async () => {
    // Real proxy; parseBigInt fails BEFORE any gRPC connection, so no backend is needed.
    const app = createApp(
      { ...config, staticDir: undefined },
      { proxy: createProxy("127.0.0.1:1", 1000), authenticate: async () => authOk },
    );
    await new Promise<void>((resolve) => { server2 = app.listen(0, () => resolve()); });
    const addr = server2.address() as AddressInfo;
    base2 = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve) => server2.close(() => resolve())); });
  it("cliente/abc -> 400 INVALID_ARGUMENT", async () => {
    const r = await fetch(`${base2}/v1/cliente/abc`, { headers: auth() });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("INVALID_ARGUMENT");
  });
  it("qr-status with non-numeric idCuenta -> 400", async () => {
    const r = await fetch(`${base2}/v1/qr-status?idc=ABC&idCuenta=zzz`, { headers: auth() });
    expect(r.status).toBe(400);
  });
});
