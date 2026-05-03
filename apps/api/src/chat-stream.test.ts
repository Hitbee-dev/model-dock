import { describe, expect, it } from "vitest";
import { hashPassword } from "@modeldock/auth";
import type { ChatCompletionStreamFetch } from "./chat-stream.js";
import { createTestHandler, invokeApi } from "./test-helpers.js";

describe("api chat streaming", () => {
  it("streams safe LiteLLM chat events to authenticated browsers", async () => {
    const upstreamCalls: Array<{ url: string; authorization?: string; body: string }> = [];
    const handler = createTestHandler({
      users: [
        {
          id: "user_1",
          email: "user@example.com",
          role: "user",
          status: "active",
          passwordHash: hashPassword({
            password: "correct-password",
            salt: Buffer.alloc(16),
            iterations: 1
          })
        }
      ],
      chatCompletionFetch: (async (url, init) => {
        upstreamCalls.push({ url, authorization: init.headers.authorization, body: init.body });
        return {
          ok: true,
          status: 200,
          body: (async function* () {
            yield 'data: {"choices":[{"delta":{"content":"Hello","reasoning_content":"hidden"}}]}\n';
            yield 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n';
          })()
        };
      }) satisfies ChatCompletionStreamFetch
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "correct-password" })
    });

    const stream = await invokeApi(handler, {
      method: "POST",
      url: "/chat/stream",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json"
      },
      body: JSON.stringify({ model: "gpt-test", messages: [{ role: "user", content: "hello" }] })
    });

    expect(stream.status).toBe(200);
    expect(stream.headers["content-type"]).toBe("text/event-stream");
    expect(stream.rawBody).toContain('"type":"token","content":"Hello"');
    expect(stream.rawBody).toContain('"type":"done","finishReason":"stop"');
    expect(stream.rawBody).not.toContain("hidden");
    expect(upstreamCalls).toEqual([
      {
        url: "http://litellm.test/chat/completions",
        authorization: "Bearer test-litellm-master-key",
        body: JSON.stringify({
          model: "gpt-test",
          messages: [{ role: "user", content: "hello" }],
          stream: true,
          user: "user_1"
        })
      }
    ]);
  });

  it("rejects unauthenticated chat streams", async () => {
    const handler = createTestHandler();
    const response = await invokeApi(handler, {
      method: "POST",
      url: "/chat/stream",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [] })
    });

    expect(response.status).toBe(401);
  });

  it("injects tenant-scoped RAG context into upstream chat messages", async () => {
    const upstreamBodies: Array<Record<string, unknown>> = [];
    const handler = createTestHandler({
      users: [
        {
          id: "user_1",
          email: "user@example.com",
          role: "user",
          status: "active",
          passwordHash: hashPassword({
            password: "correct-password",
            salt: Buffer.alloc(16),
            iterations: 1
          })
        }
      ],
      ragRetriever: async () => [
        {
          id: "doc_1:0",
          tenantId: "user_1",
          documentId: "doc_1",
          text: "Budget policy details",
          sourceUri: "s3://bucket/doc.txt?token=secret"
        }
      ],
      chatCompletionFetch: (async (_url, init) => {
        upstreamBodies.push(JSON.parse(init.body) as Record<string, unknown>);
        return { ok: true, status: 200, body: (async function* () { yield "data: [DONE]\n"; })() };
      }) satisfies ChatCompletionStreamFetch
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "correct-password" })
    });

    await invokeApi(handler, {
      method: "POST",
      url: "/chat/stream",
      headers: { cookie: login.headers["set-cookie"] ?? "", "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-test", messages: [{ role: "user", content: "What is my budget?" }] })
    });

    expect(JSON.stringify(upstreamBodies[0]?.messages)).toContain("tenant-scoped reference context");
    expect(JSON.stringify(upstreamBodies[0]?.messages)).toContain("Budget policy details");
    expect(JSON.stringify(upstreamBodies[0]?.messages)).not.toContain("token=secret");
  });
});
