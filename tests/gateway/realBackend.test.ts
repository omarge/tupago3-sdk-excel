import { describe, it, expect } from "vitest";
import { createProxy } from "../../gateway/proxy.js";

// G7 — Gateway → backend3 real gRPC integration.
// Runs ONLY when a lab JWT + reachable gRPC target are provided via environment:
//   BACKEND3_GRPC_TARGET (default 127.0.0.1:9090) and BACKEND3_LAB_JWT.
// In CI / headless Linux this is intentionally NOT EXECUTED and the gate is reported as such.
const TARGET = process.env.BACKEND3_GRPC_TARGET ?? "127.0.0.1:9090";
const LAB_JWT = process.env.BACKEND3_LAB_JWT ?? "";

describe("G7 Gateway → backend3 real (guarded)", () => {
  if (!LAB_JWT) {
    it("NOT EXECUTED — no lab JWT supplied (CI/headless). Run locally with BACKEND3_LAB_JWT.", () => {
      // Passes; records the gate as NOT EXECUTED in the certification report.
      expect(true).toBe(true);
    });
    return;
  }

  const proxy = createProxy(TARGET, 8000);

  it("T07/T08 positive: GetCatalogo(301) returns an authorized institution", async () => {
    const c = await proxy.getCatalogo("301", LAB_JWT);
    expect(c.claveInstitucion).toBe("301");
    expect(typeof c.nombreCorto).toBe("string");
  });

  it("T11 NOT_FOUND surfaced as 404 from real backend", async () => {
    await expect(proxy.getCliente("999999", LAB_JWT)).rejects.toMatchObject({ status: 404, kind: "NOT_FOUND" });
  });

  it("T12 UNAUTHENTICATED for an invalid token", async () => {
    await expect(proxy.getCatalogo("301", "not.a.valid.jwt")).rejects.toMatchObject({ status: 401, kind: "UNAUTHENTICATED" });
  });

  it("T12 UNAUTHENTICATED for a missing token", async () => {
    await expect(proxy.getCatalogo("301", "")).rejects.toMatchObject({ status: 401, kind: "UNAUTHENTICATED" });
  });
});
