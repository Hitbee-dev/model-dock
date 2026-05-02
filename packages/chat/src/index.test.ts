import { describe, expect, it } from "vitest";
import { createConversation, persistMessage } from "./index.js";

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
});
