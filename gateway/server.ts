import http from "node:http";
import https from "node:https";
import { existsSync } from "node:fs";
import { join } from "node:path";
import selfsigned from "selfsigned";
import { createApp, type AuthResult } from "./app.js";
import { createProxy } from "./proxy.js";
import { loadConfig } from "./config.js";
import { redactSecrets, safeLog } from "../src/security/redact.js";

async function backend3Authenticate(authUrl: string, username: string, password: string): Promise<AuthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error("auth failed");
    const body = JSON.parse(text) as { id_token?: string; expiresAt?: number };
    const token = body.id_token ?? (body as any).token ?? (body as any).access_token;
    if (!token) throw new Error("no token in response");
    const claims = decodeClaims(token);
    return {
      token,
      expiresAt: body.expiresAt ?? (claims?.exp ? claims.exp * 1000 : Date.now() + 3600_000),
      login: claims?.sub ?? username,
      roles: (claims?.roles as string[]) ?? [],
    };
  } finally {
    clearTimeout(timer);
  }
}

function decodeClaims(token: string): { exp?: number; sub?: string; roles?: string[] } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function main(): void {
  const config = loadConfig();
  const proxy = createProxy(config.grpcTarget, config.requestTimeoutMs);
  const distDir = join(process.cwd(), "dist");
  const app = createApp(
    { ...config, staticDir: existsSync(distDir) ? distDir : undefined },
    {
      proxy,
      authenticate: (u, p) => backend3Authenticate(config.backend3AuthUrl, u, p),
    },
  );

  const onListen = () => {
    safeLog(`TUPAGO3 Excel gateway listening on port ${config.port} (TLS=${config.enableTls}, target=${config.grpcTarget})`);
  };

  if (config.enableTls) {
    const attrs = [{ name: "commonName", value: "localhost" }];
    const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });
    const server = https.createServer({ key: pems.private, cert: pems.cert }, app);
    server.listen(config.port, onListen);
    server.on("error", (e) => safeLog(redactSecrets(`gateway error: ${describe(e)}`)));
  } else {
    const server = http.createServer(app);
    server.listen(config.port, onListen);
    server.on("error", (e) => safeLog(redactSecrets(`gateway error: ${describe(e)}`)));
  }
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

main();
