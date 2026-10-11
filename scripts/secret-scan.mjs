import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Only shipped application code is scanned for leaked secrets. Test fixtures (tests/) and
// tooling pattern definitions (scripts/) intentionally contain the literal words "client_secret"
// / "private_key" as regex/example strings, so they are excluded to avoid false positives.
const SCAN_DIRS = ["src", "gateway"];
const SCAN_FILES = ["manifest.xml"];

const PATTERNS = [
  /base64-secret\s*[:=]/i,
  /client_secret\s*[:=]\s*["']?[A-Za-z0-9_\-/+]{8,}/i,
  /private_key\s*[:=]\s*["']?[A-Za-z0-9_\-/+]{8,}/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /id_token\s*[:=]\s*["']eyJ/i,
  /Bearer\s+eyJ[A-Za-z0-9\-_]+(\.[A-Za-z0-9\-_]+){2}/,
  /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]{16,}/,
];

const SKIP = new Set(["node_modules", "dist", "dist-package", ".git", ".lab", "coverage", "vendor"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|json|xml|yml|yaml|html|css|md|txt)$/.test(e)) out.push(p);
  }
  return out;
}

const targets = [];
for (const d of SCAN_DIRS) {
  const full = join(root, d);
  if (statSync(full, { throwIfNoEntry: false })) walk(full, targets);
}
for (const f of SCAN_FILES) {
  const full = join(root, f);
  if (statSync(full, { throwIfNoEntry: false })) targets.push(full);
}

let hits = 0;
for (const f of targets) {
  let content;
  try {
    content = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const re of PATTERNS) {
    if (re.test(content)) {
      console.error(`SECRET SCAN HIT: ${f} matched ${re}`);
      hits++;
      break;
    }
  }
}

if (hits > 0) {
  console.error(`Secret scan FAILED: ${hits} hit(s).`);
  process.exit(1);
}
console.log("Secret scan PASS: no secrets in tracked sources.");
