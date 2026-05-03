import type { Conversation, LocalOnlyMessageMetadata, ServerStoredMessage } from "./domain.js";

export type ConversationExport = {
  version: 1;
  exportedAt: string;
  conversation: Conversation;
  messages: Array<ServerStoredMessage | LocalOnlyMessageMetadata>;
};

export type LocalOnlyExportMessage = {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
};

export type LocalOnlyConversationExport = {
  version: 1;
  exportedAt: string;
  conversation: Conversation & { storageMode: "local" };
  messages: LocalOnlyExportMessage[];
};

export function exportConversation(input: {
  conversation: Conversation;
  messages: Array<ServerStoredMessage | LocalOnlyMessageMetadata>;
  exportedAt: string;
}): ConversationExport {
  assertExportMessagesBelongToConversation(input.conversation, input.messages);

  return {
    version: 1,
    exportedAt: input.exportedAt,
    conversation: input.conversation,
    messages: input.messages
  };
}

export function importConversation(input: {
  payload: ConversationExport;
  currentUserId: string;
}): ConversationExport {
  if (input.payload.version !== 1) {
    throw new Error("Unsupported conversation export version.");
  }
  if (input.payload.conversation.userId !== input.currentUserId) {
    throw new Error("Conversation import belongs to a different user.");
  }
  assertExportMessagesBelongToConversation(input.payload.conversation, input.payload.messages);

  return input.payload;
}

export function exportLocalOnlyConversation(input: {
  conversation: Conversation;
  messages: LocalOnlyExportMessage[];
  exportedAt: string;
}): LocalOnlyConversationExport {
  if (input.conversation.storageMode !== "local") {
    throw new Error("Local-only export requires a local-only conversation.");
  }
  assertLocalMessagesBelongToConversation(input.conversation, input.messages);

  return {
    version: 1,
    exportedAt: input.exportedAt,
    conversation: input.conversation as Conversation & { storageMode: "local" },
    messages: input.messages
  };
}

function assertExportMessagesBelongToConversation(
  conversation: Conversation,
  messages: Array<ServerStoredMessage | LocalOnlyMessageMetadata>
): void {
  for (const message of messages) {
    if (message.userId !== conversation.userId || message.conversationId !== conversation.id) {
      throw new Error("Conversation export cannot include messages from another conversation.");
    }
    if (conversation.storageMode === "local" && "content" in message) {
      throw new Error("Server export cannot include local-only message content.");
    }
  }
}

function assertLocalMessagesBelongToConversation(
  conversation: Conversation,
  messages: LocalOnlyExportMessage[]
): void {
  for (const message of messages) {
    if (message.userId !== conversation.userId || message.conversationId !== conversation.id) {
      throw new Error("Local-only export cannot include messages from another conversation.");
    }
  }
}
