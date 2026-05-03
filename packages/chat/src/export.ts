import type { Conversation, LocalOnlyMessageMetadata, ServerStoredMessage } from "./domain.js";

export type ConversationExport = {
  version: 1;
  exportedAt: string;
  conversation: Conversation;
  messages: Array<ServerStoredMessage | LocalOnlyMessageMetadata>;
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

function assertExportMessagesBelongToConversation(
  conversation: Conversation,
  messages: Array<ServerStoredMessage | LocalOnlyMessageMetadata>
): void {
  for (const message of messages) {
    if (message.userId !== conversation.userId || message.conversationId !== conversation.id) {
      throw new Error("Conversation export cannot include messages from another conversation.");
    }
  }
}
