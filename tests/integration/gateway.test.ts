import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp, collectRoutes, type AppDeps } from "../../gateway/app.js";
import { GatewayError } from "../../gateway/proxy.js";
import type { GatewayConfig } from "../../gateway/config.js";

function makeToken(expSecondsFromNow = 3600): string {
  const h = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "lab", exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })).toString("base64url");
  return `${h}.${p}.signature`;
}

const config: GatewayConfig = {
  port: 0,
  grpcTarget: "127.0.0.1:9090",
  backend3AuthUrl: "http://localhost:8091/api/authenticate",
  corsOrigins: ["https://trusted.test", "https://localhost:8443"],
  enableTls: false,
  allowInsecure: true,
  rateLimitMax: 1000,
  rateLimitWindowMs: 60000,
  requestTimeoutMs: 5000,
  maxBodyBytes: 16384,
};

const fakeProxy: any = {
  async getCliente() {
    return { cliente: { id: "1", nombre: "Demo", claveInstitucion: "301", key: "k" }, catalogoInstitucion: { id: "2", claveInstitucion: "301", nombreCorto: "MEMBER_A" } };
  },
  async getCatalogo() {
    return { id: "2", claveInstitucion: "301", nombreCorto: "MEMBER_A" };
  },
  async getQrStatus() {
    return { json: () => JSON.stringify({ status: "PAGADO", monto: "$100.00" }) } as any;
  },
  async getTelefonicoStatus() {
    return { json: () => JSON.stringify({ status: "PENDIENTE" }) } as any;
  },
};

const authOk = { token: "jwt", expiresAt: Date.now() + 1000, login: "u", roles: ["ROLE_USER"] };

let base: string;
let server: import("node:http").Server;

beforeAll(async () => {
  const deps: AppDeps = {
    proxy: fakeProxy,
    authenticate: async () => authOk,
  };
  const app = createApp(config, deps);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function auth(token = makeToken()) {
  return { Authorization: `Bearer ${token}` };
}

// T07–T10 — Positive read operations via gateway
describe("T07-T10 Gateway read operations (positive)", () => {
  it("T07 GetCliente", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: auth() });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.cliente.id).toBe("1");
  });
  it("T08 GetCatalogo", async () => {
    const r = await fetch(`${base}/v1/catalogo/301`, { headers: auth() });
    expect(r.status).toBe(200);
    expect((await r.json()).nombreCorto).toBe("MEMBER_A");
  });
  it("T09 GetQrStatus", async () => {
    const r = await fetch(`${base}/v1/qr-status?idc=X&idCuenta=1`, { headers: auth() });
    expect(r.status).toBe(200);
    expect((await r.json()).json).toContain("PAGADO");
  });
  it("T10 GetTelefonicoStatus", async () => {
    const r = await fetch(`${base}/v1/telefonico-status?idc=X&idCuenta=1`, { headers: auth() });
    expect(r.status).toBe(200);
    expect((await r.json()).json).toContain("PENDIENTE");
  });
});

// T11–T16 — Error kind preservation through the gateway
describe("T11-T16 Gateway error mapping", () => {
  it("T11 NOT_FOUND", async () => {
    const app = createApp(config, { proxy: { ...fakeProxy, getCliente: async () => { throw new GatewayError(404, "NOT_FOUND", "nf"); } }, authenticate: async () => authOk });
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const r = await fetch(`http://127.0.0.1:${(addr as AddressInfo).port}/v1/cliente/1`, { headers: auth() });
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBe("NOT_FOUND");
    await new Promise<void>((res) => s.close(() => res()));
  });
  it("T12 UNAUTHENTICATED (missing token)", async () => {
    const r = await fetch(`${base}/v1/cliente/1`);
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("UNAUTHENTICATED");
  });
  it("T12 UNAUTHENTICATED (expired token)", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: auth(makeToken(-10)) });
    expect(r.status).toBe(401);
  });
  it("T12 UNAUTHENTICATED (malformed token)", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: { Authorization: "Bearer not.a.jwt" } });
    expect(r.status).toBe(401);
  });
  it("T13 PERMISSION_DENIED", async () => {
    const app = createApp(config, { proxy: { ...fakeProxy, getCatalogo: async () => { throw new GatewayError(403, "PERMISSION_DENIED", "pd"); } }, authenticate: async () => authOk });
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const r = await fetch(`http://127.0.0.1:${addr.port}/v1/catalogo/301`, { headers: auth() });
    expect((await r.json()).error).toBe("PERMISSION_DENIED");
    await new Promise<void>((res) => s.close(() => res()));
  });
  it("T14 INVALID_ARGUMENT", async () => {
    const app = createApp(config, { proxy: { ...fakeProxy, getCliente: async () => { throw new GatewayError(400, "INVALID_ARGUMENT", "ia"); } }, authenticate: async () => authOk });
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const r = await fetch(`http://127.0.0.1:${addr.port}/v1/cliente/abc`, { headers: auth() });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("INVALID_ARGUMENT");
    await new Promise<void>((res) => s.close(() => res()));
  });
  it("T15 DEADLINE_EXCEEDED", async () => {
    const app = createApp(config, { proxy: { ...fakeProxy, getQrStatus: async () => { throw new GatewayError(504, "DEADLINE_EXCEEDED", "de"); } }, authenticate: async () => authOk });
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const r = await fetch(`http://127.0.0.1:${addr.port}/v1/qr-status?idc=X&idCuenta=1`, { headers: auth() });
    expect((await r.json()).error).toBe("DEADLINE_EXCEEDED");
    await new Promise<void>((res) => s.close(() => res()));
  });
  it("T16 UNAVAILABLE", async () => {
    const app = createApp(config, { proxy: { ...fakeProxy, getTelefonicoStatus: async () => { throw new GatewayError(503, "UNAVAILABLE", "ua"); } }, authenticate: async () => authOk });
    const s = app.listen(0);
    const addr = s.address() as AddressInfo;
    const r = await fetch(`http://127.0.0.1:${addr.port}/v1/telefonico-status?idc=X&idCuenta=1`, { headers: auth() });
    expect((await r.json()).error).toBe("UNAVAILABLE");
    await new Promise<void>((res) => s.close(() => res()));
  });
});

// T27 — Gateway authorization
describe("T27 GatewayAuthorization", () => {
  it("rejects requests without a bearer token", async () => {
    const r = await fetch(`${base}/v1/catalogo/301`);
    expect(r.status).toBe(401);
  });
  it("rejects malformed tokens", async () => {
    const r = await fetch(`${base}/v1/catalogo/301`, { headers: { Authorization: "Token abc" } });
    expect(r.status).toBe(401);
  });
});

// T28 — Gateway CORS strictness
describe("T28 GatewayCors", () => {
  it("echoes Access-Control-Allow-Origin for a trusted origin", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: { Origin: "https://trusted.test", Authorization: `Bearer ${makeToken()}` } });
    expect(r.headers.get("access-control-allow-origin")).toBe("https://trusted.test");
  });
  it("does NOT echo origin for an untrusted origin", async () => {
    const r = await fetch(`${base}/v1/cliente/1`, { headers: { Origin: "https://evil.test", Authorization: `Bearer ${makeToken()}` } });
    expect(r.headers.get("access-control-allow-origin")).toBeNull();
  });
});

// T31 — BigInt response fields (int64 from SDK) serialize as strings, never crash res.json
describe("T31 GatewayBigIntSerialization", () => {
  const bigintProxy: any = {
    async getCliente() {
      return { cliente: { id: 72797n, nombre: "Demo", claveInstitucion: "301", key: "k" }, catalogoInstitucion: { id: 72797n, claveInstitucion: "301", nombreCorto: "MEMBER_A" } };
    },
    async getCatalogo() {
      return { id: 72797n, claveInstitucion: "301", nombreCorto: "MEMBER_A" };
    },
    async getQrStatus() {
      return { json: () => '{"idCuenta":"123","status":"PAGADO"}' } as any;
    },
    async getTelefonicoStatus() {
      return { json: () => '{"idCuenta":"123","status":"PENDIENTE"}' } as any;
    },
  };

  let bbase: string;
  let bserver: import("node:http").Server;

  beforeAll(async () => {
    const app = createApp(config, { proxy: bigintProxy, authenticate: async () => authOk });
    await new Promise<void>((resolve) => {
      bserver = app.listen(0, () => resolve());
    });
    const addr = bserver.address() as AddressInfo;
    bbase = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => bserver.close(() => resolve()));
  });

  it("serializes Cliente id BigInt as a string", async () => {
    const r = await fetch(`${bbase}/v1/cliente/1`, { headers: auth() });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.cliente.id).toBe("72797");
  });
  it("serializes Catalogo id BigInt as a string", async () => {
    const r = await fetch(`${bbase}/v1/catalogo/301`, { headers: auth() });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.id).toBe("72797");
  });
  it("passes the status view JSON string through without a serialization crash", async () => {
    const r = await fetch(`${bbase}/v1/qr-status?idc=ABC&idCuenta=123`, { headers: auth() });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(typeof body.json).toBe("string");
    expect(body.json).toContain("PAGADO");
  });
});

// T29 — No Create endpoints
describe("T29 NoCreateEndpoints", () => {
  it("exposes only read/health/login routes; no create/mutate routes", () => {
    const app = createApp(config, { proxy: fakeProxy, authenticate: async () => authOk });
    const routes = collectRoutes(app);
    const dangerous = routes.filter(
      (r) => r.method === "POST" || r.method === "PUT" || r.method === "DELETE" || /create|mutat|createqr|createtelefon/i.test(r.path),
    );
    // Only /v1/login POST is permitted (auth pass-through, not a financial Create).
    expect(dangerous.every((r) => r.path === "/v1/login")).toBe(true);
  });
});
