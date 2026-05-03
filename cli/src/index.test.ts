import { describe, expect, it } from "vitest";
import { createOwner } from "./commands/create-owner.js";
import { renderHelp } from "./commands/help.js";

describe("cli scaffold", () => {
  it("reserves the modeldock command surface", () => {
    expect(renderHelp()).toContain("create-owner");
  });

  it("creates only the first owner and stores password hashes", async () => {
    const client = new FakeClient([{ count: "0" }]);

    const ownerId = await createOwner(client, {
      databaseUrl: "postgresql://modeldock:test@localhost/modeldock",
      email: " OWNER@example.com ",
      password: "correct horse battery staple",
      displayName: "Owner"
    });

    expect(ownerId).toMatch(/^owner_/);
    expect(client.values[1]?.[1]).toBe("owner@example.com");
    expect(client.values[1]).not.toContain("correct horse battery staple");
  });

  it("refuses to create a second owner", async () => {
    const client = new FakeClient([{ count: "1" }]);

    await expect(
      createOwner(client, {
        databaseUrl: "postgresql://modeldock:test@localhost/modeldock",
        email: "owner@example.com",
        password: "correct horse battery staple",
        displayName: "Owner"
      })
    ).rejects.toThrow("already exists");
  });
});

class FakeClient {
  statements: string[] = [];
  values: Array<readonly unknown[]> = [];

  constructor(private readonly rows: unknown[]) {}

  async query<T>(text: string, values: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.statements.push(text);
    this.values.push(values);
    return { rows: this.rows as T[] };
  }
}
