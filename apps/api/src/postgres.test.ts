import { describe, expect, it } from "vitest";
import { createPostgresRegistrationStore, migrateApiDatabase } from "./postgres.js";

class FakeClient {
  statements: string[] = [];
  rows: unknown[] = [];

  async query<T>(text: string): Promise<{ rows: T[] }> {
    this.statements.push(text);
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

