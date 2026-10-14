import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "dist-package");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(join(out, "wwwroot"), { recursive: true });

// Copy build output
if (!existsSync(join(root, "dist"))) throw new Error("Missing dist/ output: run build before packaging");
cpSync(join(root, "dist"), join(out, "wwwroot"), { recursive: true });
// Copy distribution artifacts
for (const f of ["manifest.xml", "README.md", "LICENSE"]) {
  if (existsSync(join(root, f))) cpSync(join(root, f), join(out, f));
}

// Secret scan (defense for the package itself)
const SECRET_RE = /(client_secret|private_key|base64-secret|BEGIN PRIVATE KEY|id_token\s*[:=]\s*["']eyJ)/i;
let secretHits = 0;

function hashFile(p) {
  const h = createHash("sha256");
  h.update(readFileSync(p));
  return h.digest("hex");
}

function walk(dir, cb) {
  for (const entry of readdirSync(dir).sort()) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

const manifestLines = ["TUPAGO3 SDK EXCEL — PACKAGE MANIFEST", ""];
walk(out, (p) => {
  const rel = relative(out, p).split(/[\\/]/).join("/");
  const hex = hashFile(p);
  const content = readFileSync(p, "utf8");
  if (SECRET_RE.test(content)) {
    secretHits++;
    console.error(`[PACKAGE SECURITY] Possible secret in ${rel}`);
  }
  manifestLines.push(`${hex}  ${rel}`);
});
manifestLines.push("");
manifestLines.push(secretHits === 0 ? "secret-scan: PASS (no secrets detected)" : `secret-scan: FAIL (${secretHits} hit(s))`);
writeFileSync(join(out, "PACKAGE-MANIFEST.txt"), manifestLines.join("\n"));

if (secretHits > 0) {
  rmSync(out, { recursive: true, force: true });
  throw new Error(`Package secret scan failed: ${secretHits} hit(s)`);
}
console.log("Package written to dist-package/ (secret scan PASS)");

// Remove selfsigned-generated artifacts from package if present
for (const f of ["gateway/certs"]) {
  const fp = join(out, f);
  if (existsSync(fp)) rmSync(fp, { recursive: true, force: true });
}
