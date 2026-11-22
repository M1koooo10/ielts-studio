import { describe, expect, inject, it, vi } from "vitest";
import { openDatabase } from "../src/server/db/connection";
import { resolveSession, sessionHash } from "../src/server/auth/service";
import { handleSession } from "../src/server/ai/handle-session";
import { validOrigin } from "../src/server/ai/origin";
import {
  ProviderUnavailable,
  type AiProvider,
} from "../src/server/ai/provider";
import {
  IDLE_TIMEOUT_MS,
  Keyring,
  type AccountSession,
} from "../src/server/ai/sessions";

const origin = "http://localhost:3000";
const secret = "only-a-test-key-12345";
const connect = { action: "connect", provider: "openai", key: secret };
function request(body: object, source: string = origin) {
  return new Request(origin + "/api/session", {
    method: "POST",
    headers: {
      Origin: source,
      Host: "localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function setup() {
  let now = 1;
  const ring = new Keyring(() => now);
  const a: AccountSession = {
    userId: 1,
    sessionId: "first-login",
    expiresAt: 12 * 3_600_000,
  };
  const b: AccountSession = {
    userId: 2,
    sessionId: "other-login",
    expiresAt: 12 * 3_600_000,
  };
  let owner: AccountSession | null = a;
  const resolveOwner = async () => owner;
  const provider = {
    validateKey: vi
      .fn<AiProvider["validateKey"]>()
      .mockResolvedValue(undefined),
  };
  const run = (body: object, source?: string) =>
    handleSession(request(body, source), resolveOwner, ring, provider);
  return {
    a,
    b,
    ring,
    provider,
    run,
    login: (s: AccountSession | null) => {
      owner = s;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}
describe("authenticated process-local AI credentials", () => {
  it("leaves persistent SQLite data identical after connecting, testing and disconnecting a verified login", async () => {
    const { client } = await openDatabase(
      inject("databaseTestFile") + ".ai.sqlite",
    );
    try {
      const token = "a".repeat(64);
      const now = Date.now();
      await client.batch(
        [
          {
            sql: "INSERT INTO users(id,phone_number,phone_verified_at,created_at,updated_at) VALUES (12,?,?,?,?)",
            args: ["+14155550102", now, now, now],
          },
          {
            sql: "INSERT INTO auth_sessions(id,user_id,created_at,expires_at) VALUES (?,12,?,?)",
            args: [sessionHash(token), now, now + 3600000],
          },
        ],
        "write",
      );
      const data = async () => {
        const tables = (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
          )
        ).rows;
        return client.batch(
          tables.map(
            (r) =>
              'SELECT * FROM "' + String(r.name).replaceAll('"', '""') + '"',
          ),
          "read",
        );
      };
      const before = await data();
      const ring = new Keyring();
      for (const action of [
        connect,
        { action: "test" },
        { action: "disconnect" },
      ]) {
        const res = await handleSession(
          request(action),
          () => resolveSession(client, token),
          ring,
          { validateKey: async () => {} },
        );
        expect(res.status).toBe(200);
        expect(await data()).toEqual(before);
      }
    } finally {
      client.close();
    }
  });
  it("requires a verified session, even to continue offline", async () => {
    const t = setup();
    t.login(null);
    for (const data of [
      connect,
      { action: "offline" },
      { action: "test" },
      { action: "disconnect" },
    ])
      expect((await t.run(data)).status).toBe(401);
    expect(t.provider.validateKey).not.toHaveBeenCalled();
  });
  it("checks the provider before connecting and never returns the credential or sets a second cookie", async () => {
    const t = setup();
    const response = await t.run(connect);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).not.toContain(secret);
    expect(t.provider.validateKey).toHaveBeenCalledWith(secret);
    expect(t.ring.status(t.a)).toBe("connected");
    expect(new Keyring().credential(t.a)).toBeNull();
  });
  it("isolates credentials by both account and login, rejects browser-selected ownership", async () => {
    const t = setup();
    await t.run(connect);
    t.login(t.b);
    expect((await t.run({ action: "test" })).status).toBe(401);
    expect((await t.run({ action: "test", userId: 1 })).status).toBe(400);
    expect(t.ring.credential({ ...t.a, userId: t.b.userId })).toBeNull();
    expect(t.ring.credential({ ...t.a, sessionId: "second-login" })).toBeNull();
    await t.run({ ...connect, key: "other-account-secret" });
    await t.run({ action: "disconnect" });
    expect(t.ring.status(t.b)).toBe("offline");
    expect(t.ring.credential(t.a)?.key).toBe(secret);
  });
  it("aborts in-flight API calls and deletes the key on disconnect", async () => {
    const t = setup();
    await t.run(connect);
    const prior = t.ring.credential(t.a);
    await t.run({ action: "disconnect" });
    expect(t.ring.credential(t.a)).toBeNull();
    expect(prior?.signal.aborted).toBe(true);
  });
  it("expires at the idle and absolute deadlines", async () => {
    const t = setup();
    await t.run(connect);
    t.advance(IDLE_TIMEOUT_MS - 1);
    expect(t.ring.status(t.a)).toBe("connected");
    t.advance(IDLE_TIMEOUT_MS);
    t.ring.sweep();
    expect(t.ring.credential(t.a)).toBeNull();
    const soon = { ...t.a, expiresAt: 2 * IDLE_TIMEOUT_MS + 10 };
    t.login(soon);
    await t.run(connect);
    t.advance(11);
    expect(t.ring.credential(soon)).toBeNull();
    expect((await t.run(connect)).status).toBe(401);
  });
  it("protects requests against cross-site writes and rejects invalid payloads", async () => {
    const t = setup();
    for (const source of ["", "https://other.example"])
      expect((await t.run(connect, source)).status).toBe(403);
    for (const key of ["x", "x".repeat(5000)])
      expect((await t.run({ ...connect, key })).status).toBe(400);
    expect(t.provider.validateKey).not.toHaveBeenCalled();
  });
  it("requires HTTPS and a pinned host for a deployment", () => {
    const url = "https://study.example";
    const r = new Request(url, {
      headers: { origin: url, host: "study.example" },
    });
    expect(validOrigin(r, "")).toBe(false);
    expect(validOrigin(r, url)).toBe(true);
    r.headers.set("Sec-Fetch-Site", "cross-site");
    expect(validOrigin(r, url)).toBe(false);
  });
  it("preserves a working key on failed replacement and sanitizes provider errors", async () => {
    const t = setup();
    await t.run(connect);
    t.provider.validateKey.mockRejectedValue(new Error(secret));
    const result = await t.run({ ...connect, key: "another-test-key" });
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain(secret);
    expect(t.ring.credential(t.a)?.key).toBe(secret);
  });
  it("deletes a revoked provider key after explicit testing", async () => {
    const t = setup();
    await t.run(connect);
    t.provider.validateKey.mockRejectedValue(
      new ProviderUnavailable(401, "rejected"),
    );
    expect((await t.run({ action: "test" })).status).toBe(401);
    expect(t.ring.credential(t.a)).toBeNull();
  });
  it.each(["logout", "disconnect", "new-login"])(
    "rejects pending validation after %s",
    async (change) => {
      const t = setup();
      let finish!: () => void;
      let entered!: () => void;
      const pending = new Promise<void>((r) => {
        entered = r;
      });
      t.provider.validateKey.mockImplementation(() => {
        entered();
        return new Promise<void>((r) => {
          finish = r;
        });
      });
      const connecting = t.run(connect);
      await pending;
      if (change === "logout") {
        t.ring.disconnect(t.a);
        t.login(null);
      }
      if (change === "disconnect") await t.run({ action: "disconnect" });
      if (change === "new-login")
        t.login({ ...t.a, sessionId: "another-login" });
      finish();
      expect((await connecting).status).toBe(
        change === "disconnect" ? 409 : 401,
      );
      expect(t.ring.credential(t.a)).toBeNull();
    },
  );
});
