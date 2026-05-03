import type { Conversation, MessageDraft } from "./domain.js";

export type LocalOnlyConversationRecord = Conversation & {
  storageMode: "local";
};

export type LocalOnlyStoredMessage = MessageDraft & {
  id: string;
  userId: string;
  createdAt: string;
};

export type LocalOnlyIndexedDbRecord =
  | { store: "conversations"; value: LocalOnlyConversationRecord }
  | { store: "messages"; value: LocalOnlyStoredMessage };

export type LocalOnlyIndexedDbAdapter = {
  put(record: LocalOnlyIndexedDbRecord): Promise<void>;
  listMessages(conversationId: string): Promise<LocalOnlyStoredMessage[]>;
  deleteConversation(conversationId: string): Promise<void>;
};

export const localOnlyStorageWarning =
  "Local-only chats stay in this browser and are not available on other devices. Export them before clearing browser data.";

export function assertLocalOnlyConversation(conversation: Conversation): asserts conversation is LocalOnlyConversationRecord {
  if (conversation.storageMode !== "local") {
    throw new Error("IndexedDB local-only storage requires a local-only conversation.");
  }
}

export async function saveLocalOnlyConversation(input: {
  adapter: LocalOnlyIndexedDbAdapter;
  conversation: Conversation;
}): Promise<LocalOnlyConversationRecord> {
  assertLocalOnlyConversation(input.conversation);
  await input.adapter.put({ store: "conversations", value: input.conversation });
  return input.conversation;
}

export async function saveLocalOnlyMessage(input: {
  adapter: LocalOnlyIndexedDbAdapter;
  conversation: Conversation;
  message: LocalOnlyStoredMessage;
}): Promise<LocalOnlyStoredMessage> {
  assertLocalOnlyConversation(input.conversation);
  if (input.message.conversationId !== input.conversation.id || input.message.userId !== input.conversation.userId) {
    throw new Error("Local-only message does not belong to the conversation.");
  }

  await input.adapter.put({ store: "messages", value: input.message });
  return input.message;
}
