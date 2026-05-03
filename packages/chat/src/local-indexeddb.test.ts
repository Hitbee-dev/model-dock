import { describe, expect, it } from "vitest";
import {
  createConversation,
  localOnlyStorageWarning,
  saveLocalOnlyConversation,
  saveLocalOnlyMessage
} from "./index.js";

describe("local-only IndexedDB contracts", () => {
  it("persists local-only conversations and messages through an IndexedDB adapter", async () => {
    const writes: unknown[] = [];
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Local",
      storageMode: "local",
      now: "2026-05-02T00:00:00.000Z"
    });
    const adapter = {
      async put(record: unknown) {
        writes.push(record);
      },
      async listMessages() {
        return [];
      },
      async deleteConversation() {
        writes.push({ deleted: true });
      }
    };

    await saveLocalOnlyConversation({ adapter, conversation });
    await saveLocalOnlyMessage({
      adapter,
      conversation,
      message: {
        id: "msg_1",
        userId: "user_1",
        conversationId: "chat_1",
        role: "user",
        content: "private",
        createdAt: conversation.createdAt
      }
    });

    expect(writes).toHaveLength(2);
    expect(JSON.stringify(writes)).toContain("private");
    expect(localOnlyStorageWarning).toContain("this browser");
  });

  it("rejects IndexedDB persistence for server-stored conversations", async () => {
    const conversation = createConversation({
      id: "chat_1",
      userId: "user_1",
      title: "Server",
      storageMode: "server",
      now: "2026-05-02T00:00:00.000Z"
    });
    const adapter = {
      async put() {
        throw new Error("should not write");
      },
      async listMessages() {
        return [];
      },
      async deleteConversation() {
        return undefined;
      }
    };

    await expect(saveLocalOnlyConversation({ adapter, conversation })).rejects.toThrow("local-only conversation");
  });
});
