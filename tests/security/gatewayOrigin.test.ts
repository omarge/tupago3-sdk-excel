import { describe, it, expect, afterEach, vi } from "vitest";
import { TupagoApiClient } from "../../src/api/client.js";
import {
  normalizeOrigin,
  isAuthorizedOrigin,
  buildPolicy,
  resolveGatewayUrl,
  DEV_LOCALHOST_ORIGINS,
  type GatewayOriginPolicy,
} from "../../src/config/gatewayOrigin.js";

const DIST_POLICY: GatewayOriginPolicy = { allowedOrigins: ["https://gw.tupago3.example:443"], devMode: false };
const DEV_POLICY: GatewayOriginPolicy = { allowedOrigins: [...DEV_LOCALHOST_ORIGINS], devMode: true };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("R3 G3 Adversarial — authorized gateway origin", () => {
  // 1) Official endpoint allowed
  it("1) allows the authorized distribution origin and performs login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { token: "jwt", expiresAt: Date.now() + 1000, login: "u", roles: [] })),
    );
    const c = new TupagoApiClient("https://gw.tupago3.example", () => null, DIST_POLICY);
    const r = await c.login("u", "p");
    expect(r.token).toBe("jwt");
  });

  // 2) Third-party HTTPS gateway rejected (valid cert irrelevant)
  it("2) rejects a third-party HTTPS gateway even with a valid cert", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(() => new TupagoApiClient("https://evil.example.com", () => "tok", DIST_POLICY)).toThrow(/NO AUTORIZADO/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 3) localStorage tamper ignored in distribution
  it("3) ignores a malicious localStorage override in a distribution build", () => {
    const r = resolveGatewayUrl({
      gatewayUrlEnv: "https://gw.tupago3.example",
      dev: false,
      localStorageUrl: "https://evil.example.com",
    });
    expect(r.url).toBe("https://gw.tupago3.example:443");
    expect(r.userConfigurable).toBe(false);
  });

  // 4) Plaintext HTTP remote rejected
  it("4) rejects plaintext HTTP remote origin", () => {
    expect(normalizeOrigin("http://evil.example.com")).toBeNull();
    expect(isAuthorizedOrigin("http://evil.example.com", DIST_POLICY)).toBe(false);
    expect(() => new TupagoApiClient("http://evil.example.com", () => null, DIST_POLICY)).toThrow();
  });

  // 5) Login redirect to third party rejected; no credentials leak
  it("5) rejects a login redirect to a third party and never calls it", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("thirdparty")) throw new Error("third party must never be contacted");
      return { ok: false, status: 302, headers: { get: () => "https://thirdparty.example/login" }, text: async () => "" } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchSpy);
    const c = new TupagoApiClient("https://gw.tupago3.example", () => null, DIST_POLICY);
    await expect(c.login("u", "p")).rejects.toBeTruthy();
    const calls = fetchSpy.mock.calls.map((c) => c[0]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("gw.tupago3.example");
  });

  // 6) Bearer request redirect to third party rejected; token never re-sent
  it("6) rejects a Bearer request redirect to a third party", async () => {
    const tokenGetter = vi.fn(() => "secret-jwt");
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("thirdparty")) throw new Error("third party must never be contacted");
      return { ok: false, status: 302, headers: { get: () => "https://thirdparty.example/cliente/1" }, text: async () => "" } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchSpy);
    const c = new TupagoApiClient("https://gw.tupago3.example", tokenGetter, DIST_POLICY);
    await expect(c.getCliente("1")).rejects.toBeTruthy();
    const calls = fetchSpy.mock.calls.map((c) => c[0]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("gw.tupago3.example");
  });

  // 7) URL with embedded credentials rejected
  it("7) rejects a gateway URL containing user:password", () => {
    expect(normalizeOrigin("https://user:pass@gw.tupago3.example")).toBeNull();
  });

  // 8) Deceptive subdomain rejected
  it("8) rejects deceptive subdomains and suffixes", () => {
    expect(isAuthorizedOrigin("https://evil-excel.tupago3.example", DIST_POLICY)).toBe(false);
    expect(isAuthorizedOrigin("https://excel.tupago3.example.attacker.com", DIST_POLICY)).toBe(false);
    expect(isAuthorizedOrigin("https://excel.tupago3.example.:443", DIST_POLICY)).toBe(false);
    expect(isAuthorizedOrigin("https://excel.tupago3.example", DIST_POLICY)).toBe(false);
  });

  // 9) Different port rejected
  it("9) rejects a different port for the same host", () => {
    expect(isAuthorizedOrigin("https://gw.tupago3.example:9443", DIST_POLICY)).toBe(false);
    expect(isAuthorizedOrigin("https://gw.tupago3.example:8443", DIST_POLICY)).toBe(false);
    expect(isAuthorizedOrigin("https://gw.tupago3.example", DIST_POLICY)).toBe(true);
  });

  // 10) localhost permitted only in dev
  it("10) localhost permitted only under the dev policy", () => {
    expect(isAuthorizedOrigin("https://localhost:8443", DEV_POLICY)).toBe(true);
    expect(isAuthorizedOrigin("https://localhost:8443", DIST_POLICY)).toBe(false);
    // A distribution policy built without localhost excludes it.
    const distNoLocal = buildPolicy({ gatewayUrlEnv: "https://gw.tupago3.example" });
    expect(isAuthorizedOrigin("https://localhost:8443", distNoLocal)).toBe(false);
  });

  // 11) Token never sent when the destination fails validation
  it("11) token getter is never invoked when the origin is unauthorized", () => {
    const tokenGetter = vi.fn(() => "secret-jwt");
    expect(() => new TupagoApiClient("https://evil.example.com", tokenGetter, DIST_POLICY)).toThrow();
    expect(tokenGetter).not.toHaveBeenCalled();
  });

  // Bonus: a real (non-HTTPS) server never receives a request for an unauthorized origin.
  it("11b) an unauthorized origin never triggers a network request", async () => {
    const http = await import("node:http");
    let requests = 0;
    const server = http.createServer((_req, res) => {
      requests++;
      res.end("{}");
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    const tokenGetter = vi.fn(() => "secret-jwt");
    expect(() => new TupagoApiClient(`http://127.0.0.1:${port}`, tokenGetter, DIST_POLICY)).toThrow();
    expect(tokenGetter).not.toHaveBeenCalled();
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(requests).toBe(0);
    server.close();
  });
});
