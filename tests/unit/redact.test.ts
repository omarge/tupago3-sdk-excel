import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../src/security/redact.js";

// T25 — No secrets in logs
describe("T25 NoSecretsInLogs", () => {
  it("redacts JWTs (bare and Bearer) from any log string", () => {
    const jwt = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ4In0.abc123DEF456";
    const out = redactSecrets(`token enviado: ${jwt}`);
    expect(out).not.toContain(jwt);
    expect(out).toContain("[REDACTED_JWT]");
  });
  it("redacts Bearer tokens", () => {
    const out = redactSecrets("Authorization: Bearer eyJhbGci.eyJzdWI.SflKx");
    expect(out).toContain("Bearer [REDACTED_JWT]");
  });
  it("redacts secret-shaped key/value pairs", () => {
    const out = redactSecrets("client_secret=abc123verysecret");
    expect(out).not.toContain("abc123verysecret");
    expect(out).toContain("[REDACTED_SECRET]");
  });
  it("leaves non-sensitive text intact", () => {
    expect(redactSecrets("cliente 123 consultado")).toBe("cliente 123 consultado");
  });
});
