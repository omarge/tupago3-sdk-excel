import { createApp, collectRoutes } from "../gateway/app.ts";

const proxy = {
  getCliente: async () => ({}),
  getCatalogo: async () => ({}),
  getQrStatus: async () => ({ json: () => "{}" }),
  getTelefonicoStatus: async () => ({ json: () => "{}" }),
};

const app = createApp(
  {
    port: 0,
    grpcTarget: "127.0.0.1:9090",
    backend3AuthUrl: "http://localhost:8091/api/authenticate",
    corsOrigins: ["https://localhost:8443"],
    enableTls: false,
    allowInsecure: true,
    rateLimitMax: 1000,
    rateLimitWindowMs: 60000,
    requestTimeoutMs: 5000,
    maxBodyBytes: 16384,
  },
  { proxy: proxy as any, authenticate: async () => ({ token: "t", expiresAt: 0, login: "u", roles: [] }) },
);

const routes = collectRoutes(app as any);
const dangerous = routes.filter(
  (r: any) =>
    (r.method === "POST" && r.path !== "/v1/login") ||
    r.method === "PUT" ||
    r.method === "DELETE" ||
    /create|mutat/i.test(r.path),
);
if (dangerous.length > 0) {
  console.error("NO-CREATE CHECK FAILED:", dangerous);
  process.exit(1);
}
console.log(`NO-CREATE CHECK PASS: ${routes.length} routes, no Create/mutate endpoints.`);
