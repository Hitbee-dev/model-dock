import type { ServerResponse } from "node:http";
import { parseOpenAICompatibleSseLine } from "@modeldock/chat";
import { createRagAugmentedMessages, createTenantScope, type RagRetrievedChunk } from "@modeldock/rag";

export type ChatCompletionStreamFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; body: AsyncIterable<string> }>;

export type ChatRagRetriever = (input: {
  userId: string;
  query: string;
  requestedLimit: number;
}) => Promise<RagRetrievedChunk[]>;

export type ChatStreamConfig = {
  litellmBaseUrl?: string;
  litellmMasterKey?: string;
  chatCompletionFetch: ChatCompletionStreamFetch;
  ragRetriever?: ChatRagRetriever;
};

function requireLiteLLMConfig(config: ChatStreamConfig): { baseUrl: string; masterKey: string } {
  if (!config.litellmBaseUrl || !config.litellmMasterKey || config.litellmMasterKey.startsWith("replace-with-")) {
    throw new Error("LiteLLM streaming is not configured.");
  }

  return {
    baseUrl: config.litellmBaseUrl.replace(/\/+$/, ""),
    masterKey: config.litellmMasterKey
  };
}

function sendSseEvent(response: ServerResponse, event: unknown): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function extractLatestUserText(messages: unknown): string | undefined {
  if (!Array.isArray(messages)) {
    return undefined;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = asRecord(messages[index]);
    if (message?.role === "user" && typeof message.content === "string" && message.content.trim()) {
      return message.content;
    }
  }

  return undefined;
}

async function createUpstreamBody(input: {
  body: Record<string, unknown>;
  config: ChatStreamConfig;
  userId: string;
}): Promise<Record<string, unknown>> {
  const userMessage = extractLatestUserText(input.body.messages);
  if (!input.config.ragRetriever || !userMessage) {
    return input.body;
  }

  const scope = createTenantScope({ authenticatedUserId: input.userId, documentOwnerId: input.userId });
  const chunks = await input.config.ragRetriever({ userId: input.userId, query: userMessage, requestedLimit: 5 });
  return {
    ...input.body,
    messages: createRagAugmentedMessages({
      scope,
      userMessage,
      chunks,
      maxContextCharacters: 6_000
    })
  };
}

export async function streamLiteLLMChat(input: {
  config: ChatStreamConfig;
  rawBody: string;
  response: ServerResponse;
  userId: string;
}): Promise<void> {
  const config = requireLiteLLMConfig(input.config);
  const body = await createUpstreamBody({
    body: JSON.parse(input.rawBody) as Record<string, unknown>,
    config: input.config,
    userId: input.userId
  });
  const upstream = await input.config.chatCompletionFetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.masterKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ ...body, stream: true, user: input.userId })
  });
  if (!upstream.ok) {
    input.response.writeHead(502, { "content-type": "application/json" });
    input.response.end(JSON.stringify({ error: "litellm_stream_failed", status: upstream.status }));
    return;
  }

  input.response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "text/event-stream",
    "x-accel-buffering": "no"
  });

  let pending = "";
  for await (const chunk of upstream.body) {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      for (const event of parseOpenAICompatibleSseLine(line)) {
        sendSseEvent(input.response, event);
      }
    }
  }
  for (const event of parseOpenAICompatibleSseLine(pending)) {
    sendSseEvent(input.response, event);
  }
  input.response.end();
}
