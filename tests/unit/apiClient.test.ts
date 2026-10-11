import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TupagoApiClient } from "../../src/api/client.js";
import { sessionStore } from "../../src/auth/session.js";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

// T04 — Login flow (mocked gateway)
describe("T04 LoginFlow", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("login posts credentials and returns token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { token: "jwt-abc", expiresAt: Date.now() + 1000, login: "admin", roles: ["ROLE_USER"] })),
    );
    const c = new TupagoApiClient("https://localhost:8443", () => null);
    const r = await c.login("admin", "pw");
    expect(r.token).toBe("jwt-abc");
    expect(r.login).toBe("admin");
  });
  it("login failure surfaces UNAUTHENTICATED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(401, { message: "bad" })));
    const c = new TupagoApiClient("https://localhost:8443", () => null);
    await expect(c.login("a", "b")).rejects.toMatchObject({ kind: "UNAUTHENTICATED" });
  });
});

// T11–T16 — Error mapping to contract kinds
describe("T11-T16 ErrorMapping", () => {
  afterEach(() => vi.unstubAllGlobals());
  const cases: [number, string][] = [
    [400, "INVALID_ARGUMENT"],
    [403, "PERMISSION_DENIED"],
    [404, "NOT_FOUND"],
    [408, "DEADLINE_EXCEEDED"],
    [502, "UNAVAILABLE"],
    [503, "UNAVAILABLE"],
    [504, "DEADLINE_EXCEEDED"],
    [401, "UNAUTHENTICATED"],
  ];
  for (const [status, kind] of cases) {
    it(`maps HTTP ${status} -> ${kind}`, async () => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, { message: "x" })));
      const c = new TupagoApiClient("https://localhost:8443", () => "tok");
      await expect(c.getCliente("1")).rejects.toMatchObject({ kind });
    });
  }
  it("network failure -> UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));
    const c = new TupagoApiClient("https://localhost:8443", () => "tok");
    await expect(c.getCatalogo("301")).rejects.toMatchObject({ kind: "UNAVAILABLE" });
  });
});

// T26 — Reject insecure endpoint
describe("T26 RejectInsecureEndpoint", () => {
  it("rejects plaintext HTTP to a non-local host", () => {
    expect(() => new TupagoApiClient("http://evil.example.com", () => null)).toThrow(/inseguro/i);
  });
  it("allows http://localhost in lab", () => {
    expect(() => new TupagoApiClient("http://localhost:3000", () => null)).not.toThrow();
  });
});

// T05 — Token not persisted in workbook / storage
describe("T05 TokenNotPersistedInWorkbook", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
  });
  afterEach(() => {
    sessionStore.clear();
    delete (globalThis as any).localStorage;
  });
  it("stores token only in memory, never in localStorage", () => {
    sessionStore.set("secret-jwt", { login: "u", roles: [], expiresAt: Date.now() + 1000 });
    expect((globalThis as any).localStorage.getItem("tupago.token")).toBeNull();
    expect(sessionStore.getToken()).toBe("secret-jwt");
  });
  it("redacts token via toJSON (never serializes the raw JWT)", () => {
    sessionStore.set("secret-jwt", { login: "u", roles: [], expiresAt: Date.now() + 1000 });
    const s = JSON.stringify(sessionStore);
    expect(s).not.toContain("secret-jwt");
    expect(sessionStore.toJSON()).not.toContain("secret-jwt");
  });
});

// T06 — Logout
describe("T06 Logout", () => {
  afterEach(() => sessionStore.clear());
  it("clears the in-memory session", () => {
    sessionStore.set("tok", { login: "u", roles: [], expiresAt: Date.now() + 1000 });
    expect(sessionStore.isAuthenticated()).toBe(true);
    sessionStore.clear();
    expect(sessionStore.getToken()).toBeNull();
    expect(sessionStore.isAuthenticated()).toBe(false);
  });
  it("reports expiry", () => {
    sessionStore.set("tok", { login: "u", roles: [], expiresAt: Date.now() - 1000 });
    expect(sessionStore.isExpired()).toBe(true);
    expect(sessionStore.isAuthenticated()).toBe(false);
  });
});
