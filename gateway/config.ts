// Gateway configuration. ALL values come from the environment; nothing sensitive is hard-coded.
// The gateway is a translation layer ONLY: it consumes the official TuPago3 TypeScript SDK
// (gRPC) and exposes four read-only HTTPS endpoints plus a login pass-through.

export interface GatewayConfig {
  port: number;
  grpcTarget: string;
  backend3AuthUrl: string;
  corsOrigins: string[];
  enableTls: boolean;
  allowInsecure: boolean;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  requestTimeoutMs: number;
  maxBodyBytes: number;
  staticDir?: string;
}

function listEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(): GatewayConfig {
  const allowInsecure = process.env.GATEWAY_ALLOW_INSECURE === "1" || process.env.NODE_ENV !== "production";
  return {
    port: Number(process.env.GATEWAY_PORT ?? "8443"),
    grpcTarget: process.env.BACKEND3_GRPC_TARGET ?? "127.0.0.1:9090",
    backend3AuthUrl: process.env.BACKEND3_AUTH_URL ?? "http://localhost:8091/api/authenticate",
    corsOrigins: listEnv("GATEWAY_CORS_ORIGINS", ["https://localhost:8443", "https://localhost:3000", "https://localhost:8443/"]),
    enableTls: process.env.GATEWAY_TLS === "1",
    allowInsecure,
    rateLimitMax: Number(process.env.GATEWAY_RATE_LIMIT_MAX ?? "60"),
    rateLimitWindowMs: Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS ?? "60000"),
    requestTimeoutMs: Number(process.env.GATEWAY_REQUEST_TIMEOUT_MS ?? "10000"),
    maxBodyBytes: Number(process.env.GATEWAY_MAX_BODY_BYTES ?? "16384"),
  };
}
