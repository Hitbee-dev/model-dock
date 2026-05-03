import { describe, expect, it } from "vitest";
import {
  appendAssistantStreamEvent,
  createConversation,
  exportConversation,
  exportLocalOnlyConversation,
  importConversation,
  parseOpenAICompatibleSseLine,
  persistMessage
} from "./index.js";

describe("chat storage contracts", () => {
  it("stores content for server conversations", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Budget",
      storageMode: "server",
      now: "2026-05-02T00:00:00.000Z"
    });

    const message = persistMessage({
      id: "msg_1",
      userId: "user_1",
      conversation,
      draft: { conversationId: "chat_1", role: "user", content: "hello" },
      now: conversation.createdAt
    });

    expect(message).toHaveProperty("content", "hello");
  });

  it("does not store message content for local-only conversations", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Local",
      storageMode: "local",
      now: "2026-05-02T00:00:00.000Z"
    });

    const message = persistMessage({
      id: "msg_1",
      userId: "user_1",
      conversation,
      draft: { conversationId: "chat_1", role: "user", content: "private" },
      now: conversation.createdAt
    });

    expect(message).not.toHaveProperty("content");
    expect(message).toHaveProperty("contentStored", false);
  });

  it("rejects server-stored messages for a different conversation", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Server",
      storageMode: "server",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(() =>
      persistMessage({
        id: "msg_1",
        userId: "user_1",
        conversation,
        draft: { conversationId: "chat_2", role: "user", content: "wrong" },
        now: conversation.createdAt
      })
    ).toThrow("does not belong");
  });

  it("rejects local-only metadata for a different conversation", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Local",
      storageMode: "local",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(() =>
      persistMessage({
        id: "msg_1",
        userId: "user_1",
        conversation,
        draft: { conversationId: "chat_2", role: "user", content: "wrong" },
        now: conversation.createdAt
      })
    ).toThrow("does not belong");
  });

  it("exports and imports server-stored conversations for the same user", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Server",
      storageMode: "server",
      now: "2026-05-02T00:00:00.000Z"
    });
    const message = persistMessage({
      id: "msg_1",
      userId: "user_1",
      conversation,
      draft: { conversationId: "chat_1", role: "user", content: "hello" },
      now: conversation.createdAt
    });

    const payload = exportConversation({
      conversation,
      messages: [message],
      exportedAt: "2026-05-03T00:00:00.000Z"
    });

    expect(importConversation({ payload, currentUserId: "user_1" }).messages).toHaveLength(1);
    expect(() => importConversation({ payload, currentUserId: "user_2" })).toThrow("different user");
  });

  it("rejects imported payloads with mismatched message ownership", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Server",
      storageMode: "server",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(() =>
      importConversation({
        currentUserId: "user_1",
        payload: {
          version: 1,
          exportedAt: "2026-05-03T00:00:00.000Z",
          conversation,
          messages: [
            {
              id: "msg_1",
              conversationId: "chat_2",
              userId: "user_1",
              role: "user",
              content: "wrong",
              createdAt: conversation.createdAt
            }
          ]
        }
      })
    ).toThrow("another conversation");
  });

  it("rejects local-only exports that include message content", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Local",
      storageMode: "local",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(() =>
      exportConversation({
        conversation,
        exportedAt: "2026-05-03T00:00:00.000Z",
        messages: [
          {
            id: "msg_1",
            conversationId: "chat_1",
            userId: "user_1",
            role: "user",
            content: "private",
            createdAt: conversation.createdAt
          }
        ]
      })
    ).toThrow("local-only");
  });

  it("exports local-only browser conversations with content through a separate DTO", () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Local",
      storageMode: "local",
      now: "2026-05-02T00:00:00.000Z"
    });
    const payload = exportLocalOnlyConversation({
      conversation,
      exportedAt: "2026-05-03T00:00:00.000Z",
      messages: [
        {
          id: "msg_1",
          conversationId: "chat_1",
          userId: "user_1",
          role: "user",
          content: "private",
          createdAt: conversation.createdAt
        }
      ]
    });

    expect(payload.conversation.storageMode).toBe("local");
    expect(payload.messages[0]?.content).toBe("private");
  });

  it("parses OpenAI-compatible stream tokens and completion events", () => {
    expect(
      parseOpenAICompatibleSseLine(
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}'
      )
    ).toEqual([{ type: "token", content: "Hello" }]);

    expect(parseOpenAICompatibleSseLine('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}')).toEqual([
      { type: "done", finishReason: "stop" }
    ]);
    expect(parseOpenAICompatibleSseLine("data: [DONE]")).toEqual([{ type: "done" }]);
  });

  it("does not expose raw reasoning content from stream chunks", () => {
    expect(
      parseOpenAICompatibleSseLine(
        'data: {"choices":[{"delta":{"reasoning_content":"hidden","content":"Visible"}}]}'
      )
    ).toEqual([{ type: "token", content: "Visible" }]);
  });

  it("turns tool calls and malformed stream frames into safe UI events", () => {
    expect(parseOpenAICompatibleSseLine('data: {"choices":[{"delta":{"tool_calls":[]}}]}')).toEqual([
      { type: "status", status: "calling_tool", label: "Calling tool..." }
    ]);
    expect(parseOpenAICompatibleSseLine("data: {")).toEqual([{ type: "error", message: "Malformed stream frame." }]);
  });

  it("appends token events to assistant drafts only", () => {
    const draft = { conversationId: "chat_1", role: "assistant" as const, content: "" };

    expect(appendAssistantStreamEvent(draft, { type: "token", content: "Hello" }).content).toBe("Hello");
    expect(appendAssistantStreamEvent(draft, { type: "done" })).toBe(draft);
    expect(() =>
      appendAssistantStreamEvent(
        { conversationId: "chat_1", role: "user", content: "" },
        { type: "token", content: "Hello" }
      )
    ).toThrow("assistant drafts");
  });
});
