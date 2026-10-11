import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { GatewayConfig } from "./config.js";
import type { TupagoProxy } from "./proxy.js";
import { GatewayError } from "./proxy.js";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthResult {
  token: string;
  expiresAt: number;
  login: string;
  roles: string[];
}

export interface AppDeps {
  proxy: TupagoProxy;
  authenticate: (username: string, password: string) => Promise<AuthResult>;
}

export function createApp(config: GatewayConfig, deps: AppDeps): express.Express {
  const app = express();

  // TuPago3 SDK responses carry int64 fields as JavaScript BigInt. Express' res.json() cannot
  // serialize BigInt, so we register a global JSON replacer that stringifies them. The add-in
  // renders these as text in Excel anyway (gate G5: no numeric coercion of identifiers).
  app.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  // ---- Security headers (gate G7 / CSP) ----
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    );
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  // ---- CORS (strict, allow-list only) ----
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );

  // Serve the built add-in static files (so sideload points at this gateway) before the
  // catch-all 404. API routes are not shadowed because static only matches real files.
  if (config.staticDir) {
    app.use(express.static(config.staticDir));
  }

  // ---- Body parsing with hard size limit ----
  app.use(express.json({ limit: config.maxBodyBytes }));

  // ---- Rate limiting ----
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "RATE_LIMITED", message: "Demasiadas solicitudes. Intente más tarde." },
  });
  app.use("/v1", limiter);

  // ---- Health (diagnostics only, no secrets) ----
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "tupago3-excel-gateway", readOnly: true });
  });

  // ---- Login pass-through to backend3 (no token minting in the gateway) ----
  app.post("/v1/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      res.status(400).json({ error: "INVALID_ARGUMENT", message: "username y password requeridos." });
      return;
    }
    try {
      const result = await deps.authenticate(username, password);
      res.json(result);
    } catch {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Credenciales inválidas." });
    }
  });

  // ---- JWT presence + lightweight structural validation (backend3 is authoritative) ----
  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Token Bearer requerido." });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Token vacío." });
      return;
    }
    const claims = decodeJwtClaims(token);
    if (!claims) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Token malformado." });
      return;
    }
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Token expirado." });
      return;
    }
    (req as any).authToken = token;
    next();
  }

  function sendError(res: Response, e: unknown): void {
    if (e instanceof GatewayError) {
      res.status(e.status).json({ error: e.kind, message: e.message });
      return;
    }
    res.status(500).json({ error: "UNKNOWN", message: "Error interno del gateway." });
  }

  const withTimeout = (req: Request): AbortSignal | undefined => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), config.requestTimeoutMs);
    req.on("close", () => {
      clearTimeout(t);
      ac.abort();
    });
    return ac.signal;
  };

  app.get("/v1/cliente/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = await deps.proxy.getCliente(req.params.id, (req as any).authToken, withTimeout(req));
      res.json(data);
    } catch (e) {
      return sendError(res, e);
    }
  });

  app.get("/v1/catalogo/:clave", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = await deps.proxy.getCatalogo(req.params.clave, (req as any).authToken, withTimeout(req));
      res.json(data);
    } catch (e) {
      return sendError(res, e);
    }
  });

  app.get("/v1/qr-status", requireAuth, async (req: Request, res: Response) => {
    const idc = String(req.query.idc ?? "");
    const idCuenta = String(req.query.idCuenta ?? "");
    if (!idc || !idCuenta) {
      res.status(400).json({ error: "INVALID_ARGUMENT", message: "idc e idCuenta requeridos." });
      return;
    }
    try {
      const view = await deps.proxy.getQrStatus(idc, idCuenta, (req as any).authToken, withTimeout(req));
      res.json({ json: view.json() });
    } catch (e) {
      return sendError(res, e);
    }
  });

  app.get("/v1/telefonico-status", requireAuth, async (req: Request, res: Response) => {
    const idc = String(req.query.idc ?? "");
    const idCuenta = String(req.query.idCuenta ?? "");
    if (!idc || !idCuenta) {
      res.status(400).json({ error: "INVALID_ARGUMENT", message: "idc e idCuenta requeridos." });
      return;
    }
    try {
      const view = await deps.proxy.getTelefonicoStatus(idc, idCuenta, (req as any).authToken, withTimeout(req));
      res.json({ json: view.json() });
    } catch (e) {
      return sendError(res, e);
    }
  });

  // ---- 404 / no create endpoints (gate G4 / T29) ----
  app.use((req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: `Ruta no encontrada: ${req.method} ${req.path}` });
  });

  return app;
}

// Collect declared routes (used by T29 to prove no Create endpoints exist).
export function collectRoutes(app: express.Express): { method: string; path: string }[] {
  const routes: { method: string; path: string }[] = [];
  const stack = (app as any)._router?.stack ?? [];
  for (const layer of stack) {
    if (layer.route) {
      const path = layer.route.path;
      for (const m of Object.keys(layer.route.methods)) {
        routes.push({ method: m.toUpperCase(), path });
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      const base = layer.regexp ? "" : "";
      for (const inner of layer.handle.stack) {
        if (inner.route) {
          for (const m of Object.keys(inner.route.methods)) {
            routes.push({ method: m.toUpperCase(), path: base + inner.route.path });
          }
        }
      }
    }
  }
  return routes;
}

// Decode JWT payload WITHOUT verifying signature (backend3 is authoritative). Only `exp`
// is used for a cheap client-side guard; never trusts payload for authz decisions.
export function decodeJwtClaims(token: string): { exp?: number; sub?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload as { exp?: number; sub?: string };
  } catch {
    return null;
  }
}
