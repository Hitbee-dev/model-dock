export type UserStatus = "pending_approval" | "active" | "rejected" | "suspended";

export type UserRecord = {
  id: string;
  email: string;
  displayName?: string;
  status: UserStatus;
  role: "owner" | "admin" | "operator" | "user";
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
};

export type ProviderCredentialRecord = {
  id: string;
  userId: string;
  provider: string;
  encryptedSecretRef: string;
  keyId: string;
  createdAt: string;
  deletedAt?: string;
};

export type ConversationRecord = {
  id: string;
  userId: string;
  folderId?: string;
  title: string;
  storageMode: "server" | "local";
  modelId?: string;
  providerPolicyId?: string;
  pinned: boolean;
  archived: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RagDocumentRecord = {
  id: string;
  ownerId: string;
  tenantId: string;
  workspaceId?: string;
  sourceUri: string;
  objectKey?: string;
  objectByteLength?: number;
  objectChecksumSha256?: string;
  status: "queued" | "indexed" | "failed";
  createdAt: string;
  indexedAt?: string;
  deletedAt?: string;
  failureReason?: string;
};

export type RagChunkRecord = {
  id: string;
  documentId: string;
  tenantId: string;
  ordinal: number;
  textChecksumSha256: string;
  weaviateObjectId: string;
};

export type AuditLogRecord = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: "allowed" | "denied" | "failed";
  createdAt: string;
};
