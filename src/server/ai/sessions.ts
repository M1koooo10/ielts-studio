export type SessionStatus = "new" | "offline" | "connected";
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export interface AccountSession {
  sessionId: string;
  userId: number;
  expiresAt: number;
}

type Principal = Pick<AccountSession, "sessionId" | "userId">;
type Entry = {
  key?: string;
  lastUsed: number;
  expiresAt: number;
  controller: AbortController;
  pending?: symbol;
};

function slot(owner: Principal) {
  return `${owner.userId}:${owner.sessionId}`;
}

/** Process-local. A new login always has an independent slot, including for the same account. */
export class Keyring {
  private readonly entries = new Map<string, Entry>();
  constructor(private readonly now = Date.now) {}

  private find(owner: AccountSession) {
    const entry = this.entries.get(slot(owner));
    if (!entry) return;
    const now = this.now();
    if (
      now >= Math.min(entry.expiresAt, owner.expiresAt) ||
      now - entry.lastUsed >= IDLE_TIMEOUT_MS
    ) {
      this.disconnect(owner);
      return;
    }
    return entry;
  }

  credential(owner: AccountSession) {
    const entry = this.find(owner);
    if (!entry?.key) return null;
    entry.lastUsed = this.now();
    return { key: entry.key, signal: entry.controller.signal };
  }

  status(owner: AccountSession | null): SessionStatus {
    if (!owner || owner.expiresAt <= this.now()) return "new";
    return this.credential(owner) ? "connected" : "offline";
  }

  begin(owner: AccountSession) {
    let entry = this.find(owner);
    if (!entry) {
      entry = {
        lastUsed: this.now(),
        expiresAt: owner.expiresAt,
        controller: new AbortController(),
      };
      this.entries.set(slot(owner), entry);
    }
    const revision = Symbol();
    entry.pending = revision;
    return revision;
  }

  finish(owner: AccountSession, revision: symbol, key?: string) {
    const entry = this.find(owner);
    if (!entry || entry.pending !== revision) return false;
    delete entry.pending;
    if (key) {
      entry.controller.abort();
      entry.controller = new AbortController();
      entry.key = key;
      entry.lastUsed = this.now();
    } else if (!entry.key) {
      this.disconnect(owner);
    }
    return true;
  }

  disconnect(owner: Principal) {
    const entry = this.entries.get(slot(owner));
    if (!entry) return;
    delete entry.key;
    this.entries.delete(slot(owner));
    entry.controller.abort();
  }

  sweep() {
    const now = this.now();
    for (const [id, entry] of this.entries) {
      if (now >= entry.expiresAt || now - entry.lastUsed >= IDLE_TIMEOUT_MS) {
        delete entry.key;
        this.entries.delete(id);
        entry.controller.abort();
      }
    }
  }
}

const runtime = globalThis as typeof globalThis & {
  studioAccountKeyring?: Keyring;
};
function createKeyring() {
  const ring = new Keyring();
  setInterval(() => ring.sweep(), 60_000).unref();
  return ring;
}
export const keyring = (runtime.studioAccountKeyring ??= createKeyring());
export const revokeAI = (owner: Principal) => keyring.disconnect(owner);
