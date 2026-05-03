import type { ServerResponse } from "node:http";
import { parseOpenAICompatibleSseLine } from "@modeldock/chat";

export type ChatCompletionStreamFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; body: AsyncIterable<string> }>;

export type ChatStreamConfig = {
  litellmBaseUrl?: string;
  litellmMasterKey?: string;
  chatCompletionFetch: ChatCompletionStreamFetch;
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

export async function streamLiteLLMChat(input: {
  config: ChatStreamConfig;
  rawBody: string;
  response: ServerResponse;
  userId: string;
}): Promise<void> {
  const config = requireLiteLLMConfig(input.config);
  const upstream = await input.config.chatCompletionFetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.masterKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ ...JSON.parse(input.rawBody), stream: true, user: input.userId })
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
