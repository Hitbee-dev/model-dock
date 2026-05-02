export type ConversationStorageMode = "server" | "local";

export type ConversationFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  storageMode: ConversationStorageMode;
  folderId?: string;
  modelId?: string;
  providerPolicyId?: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageDraft = {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export type ServerStoredMessage = MessageDraft & {
  id: string;
  userId: string;
  createdAt: string;
};

export type LocalOnlyMessageMetadata = Omit<MessageDraft, "content"> & {
  id: string;
  userId: string;
  createdAt: string;
  contentStored: false;
};
