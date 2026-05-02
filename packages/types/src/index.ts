export type Role = "owner" | "admin" | "operator" | "user";

export type StorageMode = "server" | "local";

export type RequiredDomain =
  | "User"
  | "Session"
  | "Role"
  | "Workspace"
  | "ProviderConnection"
  | "ProviderCredential"
  | "ModelPolicy"
  | "LiteLLMUser"
  | "LiteLLMVirtualKey"
  | "CreditGrant"
  | "CreditLedgerEntry"
  | "BudgetPolicy"
  | "Conversation"
  | "ConversationFolder"
  | "Message"
  | "MessageAttachment"
  | "MCPServer"
  | "MCPPermission"
  | "Skill"
  | "AuditLog"
  | "SystemSetting";
