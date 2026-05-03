import { describe, expect, it } from "vitest";
import { hashPassword, hashSessionToken } from "@modeldock/auth";
import { createPostgresAuthStore } from "./postgres-auth-store.js";
import { createPostgresRegistrationStore, migrateApiDatabase } from "./postgres.js";

class FakeClient {
  statements: string[] = [];
  values: Array<readonly unknown[]> = [];
  rows: unknown[] = [];

  async query<T>(text: string, values: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.statements.push(text);
    this.values.push(values);
    return { rows: this.rows as T[] };
  }
}

describe("postgres registration store", () => {
  it("runs the API database migration", async () => {
    const client = new FakeClient();

    await migrateApiDatabase(client);

    expect(client.statements.join("\n")).toContain("create table if not exists users");
  });

  it("keeps provider approval writes parameterized", async () => {
    const client = new FakeClient();
    client.rows = [
      {
        id: "reg_1",
        email: "user@example.com",
        display_name: null,
        status: "active",
        created_at: new Date("2026-05-03T00:00:00.000Z"),
        approved_at: new Date("2026-05-03T00:00:01.000Z"),
        approved_by: "owner_1"
      }
    ];

    const store = createPostgresRegistrationStore(client);
    const approved = await store.approve("reg_1", "owner_1");

    expect(approved.status).toBe("active");
    expect(client.statements[0]).toContain("where id = $1");
  });
});

describe("postgres auth store", () => {
  it("loads active users with password hashes from PostgreSQL", async () => {
    const client = new FakeClient();
    const passwordHash = hashPassword({
      password: "correct horse battery staple",
      iterations: 1_000,
      salt: new Uint8Array(16).fill(2)
    });
    client.rows = [
      {
        id: "user_1",
        email: "user@example.com",
        role: "user",
        status: "active",
        password_hash_algorithm: passwordHash.algorithm,
        password_hash_iterations: passwordHash.iterations,
        password_hash_salt: passwordHash.salt,
        password_hash_value: passwordHash.hash
      }
    ];

    const store = createPostgresAuthStore(client);
    const user = await store.findActiveUserByEmail(" USER@example.com ");

    expect(user?.passwordHash).toEqual(passwordHash);
    expect(client.values[0]).toEqual(["user@example.com"]);
  });

  it("persists session hashes without storing raw tokens", async () => {
    const client = new FakeClient();
    const store = createPostgresAuthStore(client);

    await store.saveSession({
      id: "sess_1",
      userId: "user_1",
      email: "user@example.com",
      role: "user",
      sessionTokenHash: "hashed-session-token",
      csrfTokenHash: "hashed-csrf-token",
      expiresAt: "2026-05-03T01:00:00.000Z"
    });

    expect(client.statements[0]).toContain("insert into sessions");
    expect(client.values[0]).toEqual([
      "sess_1",
      "user_1",
      "hashed-session-token",
      "hashed-csrf-token",
      "2026-05-03T01:00:00.000Z"
    ]);
  });

  it("finds sessions by server-side token hash and revokes by id", async () => {
    const client = new FakeClient();
    client.rows = [
      {
        id: "sess_1",
        user_id: "user_1",
        email: "user@example.com",
        role: "user",
        session_token_hash: "stored-hash",
        csrf_token_hash: "csrf-hash",
        expires_at: new Date("2026-05-03T01:00:00.000Z")
      }
    ];
    const store = createPostgresAuthStore(client);

    const session = await store.findSessionByToken({
      token: "raw-session-token",
      sessionSecret: "0123456789abcdef0123456789abcdef",
      now: new Date("2026-05-03T00:00:00.000Z")
    });
    await store.deleteSession("sess_1");

    expect(session?.id).toBe("sess_1");
    expect(client.values[1]?.[0]).toBe(
      hashSessionToken({
        token: "raw-session-token",
        sessionSecret: "0123456789abcdef0123456789abcdef"
      })
    );
    expect(client.values.flat()).not.toContain("raw-session-token");
    expect(client.statements.at(-1)).toContain("set revoked_at = now()");
  });
});
