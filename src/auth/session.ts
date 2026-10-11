import type { SessionIdentity } from "../models/types.js";
import { redactSecrets } from "../security/redact.js";

// IMPORTANT: the JWT is held ONLY in process/memory. It is NEVER written to a workbook cell,
// NEVER persisted in localStorage/sessionStorage, and NEVER logged. This is a hard security gate.
interface Session {
  token: string;
  identity: SessionIdentity;
}

let current: Session | null = null;

export const sessionStore = {
  set(token: string, identity: SessionIdentity): void {
    if (!token) throw new Error("Token vacío rechazado por seguridad");
    current = { token, identity };
  },
  getToken(): string | null {
    return current?.token ?? null;
  },
  getIdentity(): SessionIdentity | null {
    return current?.identity ?? null;
  },
  isAuthenticated(): boolean {
    return current !== null && !this.isExpired();
  },
  isExpired(): boolean {
    if (!current) return true;
    return Date.now() >= current.identity.expiresAt;
  },
  clear(): void {
    current = null;
  },
  // Defensive: ensure a token can never be serialized accidentally (e.g. into a cell or log).
  toJSON(): string {
    return redactSecrets("[session-redacted]");
  },
};

// Guard against accidental structured-clone / JSON exposure of the token.
Object.defineProperty(sessionStore, "token", { enumerable: false, get: () => undefined });
