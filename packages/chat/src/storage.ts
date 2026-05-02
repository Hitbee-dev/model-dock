import type { Conversation, LocalOnlyMessageMetadata, MessageDraft, ServerStoredMessage } from "./domain.js";

export function createConversation(input: {
  id: string;
  userId: string;
  title: string;
  storageMode: "server" | "local";
  now: string;
}): Conversation {
  return {
    id: input.id,
    userId: input.userId,
    title: input.title.trim() || "Untitled",
    storageMode: input.storageMode,
    pinned: false,
    archived: false,
    createdAt: input.now,
    updatedAt: input.now
  };
}

export function persistMessage(input: {
  id: string;
  userId: string;
  conversation: Conversation;
  draft: MessageDraft;
  now: string;
}): ServerStoredMessage | LocalOnlyMessageMetadata {
  if (input.conversation.userId !== input.userId) {
    throw new Error("Conversation does not belong to the current user.");
  }

  if (input.draft.conversationId !== input.conversation.id) {
    throw new Error("Message draft does not belong to the conversation.");
  }

  if (input.conversation.storageMode === "local") {
    return {
      id: input.id,
      userId: input.userId,
      conversationId: input.conversation.id,
      role: input.draft.role,
      createdAt: input.now,
      contentStored: false
    };
  }

  return {
    id: input.id,
    userId: input.userId,
    conversationId: input.conversation.id,
    role: input.draft.role,
    content: input.draft.content,
    createdAt: input.now
  };
}
