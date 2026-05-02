export type MCPServerTransport = "stdio" | "http";

export type MCPServerRegistration = {
  id: string;
  ownerId: string;
  displayName: string;
  transport: MCPServerTransport;
  endpoint: string;
  enabled: boolean;
  secretRef?: string;
};

export type MCPPermission = {
  userId: string;
  serverId: string;
  toolName: string;
  decision: "allow_once" | "allow_session" | "deny";
  decidedAt: string;
};

export function createMCPServerRegistration(input: MCPServerRegistration): MCPServerRegistration {
  if (!input.ownerId || !input.displayName.trim() || !input.endpoint.trim()) {
    throw new Error("MCP server registration requires owner, name, and endpoint.");
  }

  return {
    ...input,
    displayName: input.displayName.trim()
  };
}

export function canExecuteMCPTool(permission: MCPPermission | undefined): boolean {
  return permission?.decision === "allow_once" || permission?.decision === "allow_session";
}

export function redactMCPServer(server: MCPServerRegistration): Omit<MCPServerRegistration, "secretRef"> {
  const { secretRef: _secretRef, ...redacted } = server;
  return redacted;
}
