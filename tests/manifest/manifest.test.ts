import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, "..", "..", "manifest.xml");
const manifest = readFileSync(manifestPath, "utf8");

// T01 — Manifest validity (structural smoke check; not a live sideload).
describe("T01 ManifestValid", () => {
  const required = [
    "OfficeApp",
    "TaskPaneApp",
    "<Id>",
    "<Version>",
    "<DisplayName",
    '<Host Name="Workbook"',
    "ExcelApi",
    "SourceLocation",
    "ReadWriteDocument",
  ];
  for (const token of required) {
    it(`contains ${token}`, () => {
      expect(manifest).toContain(token);
    });
  }
  it("is well-formed XML (balanced OfficeApp root)", () => {
    const opens = (manifest.match(/<OfficeApp/g) || []).length;
    const closes = (manifest.match(/<\/OfficeApp>/g) || []).length;
    expect(opens).toBe(1);
    expect(closes).toBe(1);
  });
  it("uses HTTPS SourceLocation (no plaintext endpoints in the distributed manifest)", () => {
    const loc = manifest.match(/<SourceLocation[^>]*DefaultValue="([^"]+)"/);
    expect(loc).not.toBeNull();
    expect(loc![1].startsWith("https://")).toBe(true);
  });
  it("declares ExcelApi MinVersion 1.1 requirement", () => {
    expect(manifest).toMatch(/<Set Name="ExcelApi" MinVersion="1\.1"/);
  });
  it("does not embed any Create operation in the manifest", () => {
    expect(manifest).not.toMatch(/createQr|createTelefonico|CreateQr|CreateTelefonico/i);
  });
});
