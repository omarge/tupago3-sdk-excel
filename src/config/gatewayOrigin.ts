// Authorized Gateway Origin policy (R3).
//
// The add-in MUST only ever talk to a gateway whose origin (scheme://host:port) is
// explicitly authorized at build/deploy time. This module is the single source of truth
// for that allow-list and the canonical-origin validation used by both the UI and the
// API client. It is intentionally pure and fully unit-testable.

export interface GatewayOriginPolicy {
  // Canonical authorized origins, e.g. ["https://excel.tupago3.example:443"].
  allowedOrigins: string[];
  // When true, localhost origins are permitted (controlled development / lab only).
  devMode: boolean;
}

export const DEV_LOCALHOST_ORIGINS = ["https://localhost:8443", "https://127.0.0.1:8443"];

/**
 * Canonicalize a gateway URL to "https://host:port". Returns null for anything that must
 * never be an authorized origin:
 *  - non-https scheme (plaintext HTTP is rejected everywhere, including localhost),
 *  - embedded userinfo (user:pass@),
 *  - URL fragment (#),
 *  - a non-empty path or query (the gateway base is origin-only; paths are API routes),
 *  - unparseable input.
 * Hostname is taken verbatim (URL lower-cases it) so exact-match prevents subdomain and
 * prefix confusion (evil-excel.tupago3.example, excel.tupago3.example.attacker.com, etc.).
 */
export function normalizeOrigin(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.hash) return null;
  if (u.pathname && u.pathname !== "/") return null;
  if (u.search) return null;
  const port = u.port || "443";
  return `https://${u.hostname}:${port}`;
}

/** Build the policy from build/deploy inputs. Distribution sets VITE_GATEWAY_URL (no localhost). */
export function buildPolicy(opts: { gatewayUrlEnv?: string; dev?: boolean }): GatewayOriginPolicy {
  const env = (opts.gatewayUrlEnv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (env.length > 0) {
    const allowed = env.map(normalizeOrigin).filter((o): o is string => o !== null);
    // Distribution: explicit, https-only origins; localhost is NOT authorized here.
    return { allowedOrigins: allowed, devMode: false };
  }
  // Development / lab: only localhost origins may be used.
  return { allowedOrigins: [...DEV_LOCALHOST_ORIGINS], devMode: !!opts.dev };
}

export function isAuthorizedOrigin(url: string, policy: GatewayOriginPolicy): boolean {
  const o = normalizeOrigin(url);
  if (!o) return false;
  return policy.allowedOrigins.includes(o);
}

export interface ResolvedGateway {
  url: string;
  policy: GatewayOriginPolicy;
  // false in distribution (URL is build-fixed); true only in dev/lab where localhost edits are allowed.
  userConfigurable: boolean;
}

/**
 * Resolve the effective gateway URL.
 *  - Distribution (VITE_GATEWAY_URL set): the authorized build origin is authoritative and
 *    any persisted localStorage override is IGNORED (a localStorage tamper cannot redirect
 *    credentials in a distribution build).
 *  - Dev/lab: a localhost localStorage override is honored only if it is itself an authorized
 *    dev origin; otherwise the default localhost origin is used.
 * Throws if no authorized origin could be determined (fail closed).
 */
export function resolveGatewayUrl(opts: {
  gatewayUrlEnv?: string;
  dev?: boolean;
  localStorageUrl?: string | null;
}): ResolvedGateway {
  const policy = buildPolicy(opts);
  if (policy.allowedOrigins.length === 0) {
    throw new Error("No hay orígenes de gateway autorizados configurados.");
  }
  if (opts.gatewayUrlEnv && opts.gatewayUrlEnv.trim()) {
    return { url: policy.allowedOrigins[0], policy, userConfigurable: false };
  }
  const ls = opts.localStorageUrl;
  if (ls) {
    const norm = normalizeOrigin(ls);
    if (norm && policy.allowedOrigins.includes(norm)) {
      return { url: norm, policy, userConfigurable: policy.devMode };
    }
  }
  return { url: policy.allowedOrigins[0], policy, userConfigurable: policy.devMode };
}
