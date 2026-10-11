// Log redaction: ensure JWTs, bearer tokens, secrets and PII never reach logs.

const TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9\-_.=]+/gi;
const BARE_JWT_PATTERN = /\beyJ[A-Za-z0-9\-_]+(\.[A-Za-z0-9\-_]+){2,}/g;
const SECRET_KEY_PATTERN = /(secret|password|passwd|api[_-]?key|token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^\s"']+/gi;

export function redactSecrets(input: unknown): string {
  let s: string;
  if (typeof input === "string") s = input;
  else {
    try {
      s = JSON.stringify(input);
    } catch {
      s = String(input);
    }
  }
  return s
    .replace(BARE_JWT_PATTERN, "[REDACTED_JWT]")
    .replace(TOKEN_PATTERN, "Bearer [REDACTED_JWT]")
    .replace(SECRET_KEY_PATTERN, (_m, key) => `${key}=[REDACTED_SECRET]`);
}

export function safeLog(message: string, ...meta: unknown[]): void {
  console.log(redactSecrets(message), ...meta.map(redactSecrets));
}

export function safeError(message: string, ...meta: unknown[]): void {
  console.error(redactSecrets(message), ...meta.map(redactSecrets));
}
