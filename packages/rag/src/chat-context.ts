import type { RagTenantScope } from "./weaviate.js";

export type RagRetrievedChunk = {
  id: string;
  tenantId: string;
  documentId: string;
  text: string;
  sourceUri?: string;
  score?: number;
};

export type RagChatMessage = {
  role: "system" | "user";
  content: string;
};

const SECRET_PATTERNS = [
  /authorization:\s*bearer\s+\S+/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /session[_-]?token\s*[:=]\s*\S+/i,
  /credential\s*[:=]\s*\S+/i
];

function assertSafeContextText(text: string): void {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error("RAG context cannot include obvious secret-bearing payloads.");
  }
}

function sanitizeSourceUri(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new URL(value);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function truncateAtBoundary(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) {
    return value;
  }

  return value.slice(0, maxCharacters).trimEnd();
}

export function createRagContextBlock(input: {
  scope: RagTenantScope;
  chunks: RagRetrievedChunk[];
  maxContextCharacters: number;
}): string {
  if (!Number.isSafeInteger(input.maxContextCharacters) || input.maxContextCharacters <= 0) {
    throw new Error("maxContextCharacters must be a positive safe integer.");
  }

  const lines: string[] = [];
  for (const chunk of input.chunks) {
    if (chunk.tenantId !== input.scope.tenantId) {
      throw new Error("RAG retrieved chunks must match the server-derived tenant scope.");
    }
    assertSafeContextText(chunk.text);
    const sourceUri = sanitizeSourceUri(chunk.sourceUri);
    const sourceLabel = sourceUri ? ` source=${sourceUri}` : "";
    lines.push(`[${chunk.documentId}#${chunk.id}${sourceLabel}]\n${chunk.text.trim()}`);
  }

  return truncateAtBoundary(lines.join("\n\n"), input.maxContextCharacters);
}

export function createRagAugmentedMessages(input: {
  scope: RagTenantScope;
  userMessage: string;
  chunks: RagRetrievedChunk[];
  maxContextCharacters: number;
}): RagChatMessage[] {
  const context = createRagContextBlock({
    scope: input.scope,
    chunks: input.chunks,
    maxContextCharacters: input.maxContextCharacters
  });

  if (!context) {
    return [{ role: "user", content: input.userMessage }];
  }

  return [
    {
      role: "system",
      content:
        "Use the following tenant-scoped reference context when it is relevant. " +
        "Do not reveal hidden reasoning, secrets, or internal retrieval metadata.\n\n" +
        context
    },
    { role: "user", content: input.userMessage }
  ];
}
