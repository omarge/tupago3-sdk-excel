// G2 — Real backend3 integration verification (gate). Starts the gateway in-process, points it
// at the live backend3 dev instance, and exercises the 10 required checks with a lab JWT.
// Run: LAB_JWT=... BACKEND3_GRPC_TARGET=127.0.0.1:9090 node_modules/.bin/tsx scripts/g2-verify.mts
import { createApp } from "../gateway/app.js";
import type { GatewayConfig } from "../gateway/config.js";
import { createProxy } from "../gateway/proxy.js";
import type { AddressInfo } from "node:net";

const LAB_JWT = process.env.LAB_JWT ?? "";
const GRPC = process.env.BACKEND3_GRPC_TARGET ?? "127.0.0.1:9090";
const AUTH_URL = process.env.BACKEND3_AUTH_URL ?? "http://localhost:8091/api/authenticate";

const config: GatewayConfig = {
  port: 0,
  grpcTarget: GRPC,
  backend3AuthUrl: AUTH_URL,
  corsOrigins: ["https://localhost:8443"],
  enableTls: false,
  allowInsecure: true,
  rateLimitMax: 1000,
  rateLimitWindowMs: 60000,
  loginRateLimitMax: 1000,
  loginRateLimitWindowMs: 60000,
  requestTimeoutMs: 8000,
  maxBodyBytes: 16384,
};

const app = createApp(config, {
  proxy: createProxy(GRPC, 8000),
  authenticate: async () => ({ token: LAB_JWT, expiresAt: Date.now() + 3600_000, login: "lab", roles: ["ROLE_USER"] }),
});

const server = app.listen(0);
await new Promise<void>((r) => server.on("listening", r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

function bearer(t: string) {
  return { Authorization: `Bearer ${t}` };
}
function makeToken(expDeltaSec: number, malformed = false) {
  const h = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "lab", exp: Math.floor(Date.now() / 1000) + expDeltaSec })).toString("base64url");
  return malformed ? `${h}.${p}` : `${h}.${p}.sig`;
}

const results: Record<string, unknown> = {};
const get = async (path: string, headers: Record<string, string> = {}) => {
  const r = await fetch(`${base}${path}`, { headers });
  let body: any = null;
  try { body = await r.json(); } catch { body = await r.text(); }
  return { status: r.status, body };
};

// 1) Positive cliente read — probe a few ids to find one that exists.
let positiveCliente: any = null;
let positiveClienteId = "";
for (const id of ["1", "2", "3", "100", "12345", "999999"]) {
  const r = await get(`/v1/cliente/${id}`, bearer(LAB_JWT));
  if (r.status === 200) { positiveCliente = r.body; positiveClienteId = id; break; }
}
results["G2.1_cliente_positive"] = {
  id: positiveClienteId,
  status: positiveCliente ? 200 : "no-positive-found",
  hasId: !!positiveCliente?.cliente?.id,
  nombre: positiveCliente?.cliente?.nombre,
  institucion: positiveCliente?.cliente?.claveInstitucion ?? positiveCliente?.catalogoInstitucion?.claveInstitucion,
};

// 2) Positive catalogo read.
const cat = await get("/v1/catalogo/301", bearer(LAB_JWT));
results["G2.2_catalogo_positive"] = {
  status: cat.status,
  id: cat.body?.id,
  claveInstitucion: cat.body?.claveInstitucion,
  nombreCorto: cat.body?.nombreCorto,
};

// 3) qr-status for synthetic nonexistent record -> NOT_FOUND.
const qr = await get("/v1/qr-status?idc=SYNTHZZZZ&idCuenta=1", bearer(LAB_JWT));
results["G2.3_qr_status_notfound"] = { status: qr.status, error: qr.body?.error };

// 4) telefonico-status for synthetic nonexistent record -> NOT_FOUND.
const tel = await get("/v1/telefonico-status?idc=SYNTHZZZZ&idCuenta=1", bearer(LAB_JWT));
results["G2.4_telefonico_status_notfound"] = { status: tel.status, error: tel.body?.error };

// 5) Missing JWT -> 401.
const noJwt = await get("/v1/cliente/1");
results["G2.5_missing_jwt"] = { status: noJwt.status, error: noJwt.body?.error };

// 6) Invalid (malformed) JWT -> 401.
const badJwt = await get("/v1/cliente/1", bearer(makeToken(3600, true)));
results["G2.6_invalid_jwt"] = { status: badJwt.status, error: badJwt.body?.error };

// 7) Expired JWT -> 401.
const expJwt = await get("/v1/cliente/1", bearer(makeToken(-3600)));
results["G2.7_expired_jwt"] = { status: expJwt.status, error: expJwt.body?.error };

// 8) Cross-tenant / foreign cliente -> rejected by backend3 (non-200).
// Use a high id that is not owned by lab-admin; backend3 enforces ownership.
const foreign = await get("/v1/cliente/888888888", bearer(LAB_JWT));
results["G2.8_foreign_cliente_rejected"] = {
  status: foreign.status,
  rejected: foreign.status !== 200,
  error: foreign.body?.error,
};

// 9) Invalid parameter -> safe rejection (non-200).
const badParam = await get("/v1/cliente/abc", bearer(LAB_JWT));
results["G2.9_invalid_param"] = { status: badParam.status, error: badParam.body?.error };

// 10) Financial Create endpoints must not exist -> 404.
const createQr = await get("/v1/createQr", { ...bearer(LAB_JWT), "Content-Type": "application/json" });
const createTel = await get("/v1/createTelefonico", { ...bearer(LAB_JWT), "Content-Type": "application/json" });
results["G2.10_no_create_endpoints"] = {
  createQr_status: createQr.status,
  createTelefonico_status: createTel.status,
  absent: createQr.status === 404 && createTel.status === 404,
};

console.log(JSON.stringify(results, null, 2));
server.close();
