import { createApp } from "../gateway/app.ts";
import { createProxy } from "../gateway/proxy.ts";
import { loadConfig } from "../gateway/config.ts";

const jwt = process.env.LAB_JWT ?? "";
const target = process.env.BACKEND3_GRPC_TARGET ?? "127.0.0.1:9090";

const config = { ...loadConfig(), port: 0, grpcTarget: target, staticDir: undefined, enableTls: false };
const proxy = createProxy(config.grpcTarget, config.requestTimeoutMs);
const app = createApp(config, {
  proxy,
  authenticate: async () => ({ token: jwt, expiresAt: Date.now() + 1000, login: "lab", roles: [] }),
});

const server = app.listen(0, async () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const out: Record<string, unknown> = {};
  try {
    out.healthz = await (await fetch(`${base}/healthz`)).json();
    const cat = await fetch(`${base}/v1/catalogo/301`, { headers: { Authorization: `Bearer ${jwt}` } });
    out.catalogo = { status: cat.status, body: await cat.json() };
    const nf = await fetch(`${base}/v1/cliente/999999`, { headers: { Authorization: `Bearer ${jwt}` } });
    out.notFound = { status: nf.status, body: await nf.json() };
    const noauth = await fetch(`${base}/v1/catalogo/301`);
    out.noAuth = noauth.status;
  } catch (e) {
    out.error = String(e);
  }
  console.log(JSON.stringify(out, null, 2));
  server.close(() => process.exit(0));
});
server.on("error", (e) => {
  console.error("server error", e);
  process.exit(1);
});
setTimeout(() => {
  console.error("smoke timeout");
  process.exit(2);
}, 20000);
