import { describe, expect, it } from "vitest";
import { canExecuteMCPTool, createMCPServerRegistration, redactMCPServer } from "./index.js";

describe("mcp contracts", () => {
  it("requires explicit permission before tool execution", () => {
    expect(canExecuteMCPTool(undefined)).toBe(false);
    expect(
      canExecuteMCPTool({
        userId: "user_1",
        serverId: "srv_1",
        toolName: "search",
        decision: "allow_once",
        decidedAt: "2026-05-02T00:00:00.000Z"
      })
    ).toBe(true);
  });

  it("redacts MCP secret references from server output", () => {
    const server = createMCPServerRegistration({
      id: "srv_1",
      ownerId: "user_1",
      displayName: " Docs ",
      transport: "http",
      endpoint: "http://mcp.local",
      enabled: true,
      secretRef: "secret_1"
    });

    expect(server.displayName).toBe("Docs");
    expect(redactMCPServer(server)).not.toHaveProperty("secretRef");
  });
});
