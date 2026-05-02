export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "vllm" | "custom";

export type ProviderCredentialRef = {
  id: string;
  provider: ProviderKind;
  keyId: string;
  createdAt: string;
  deletedAt?: string;
};

export type ProviderCredentialInput = {
  userId: string;
  provider: ProviderKind;
  displayName?: string;
  secret: string;
};

export type StoredProviderCredential = ProviderCredentialRef & {
  userId: string;
  displayName?: string;
  encryptedSecretRef: string;
};

export function isSubscriptionOAuthEnabled(flag: boolean): boolean {
  return flag === true;
}

export function createCredentialRef(input: {
  id: string;
  provider: ProviderKind;
  keyId: string;
  createdAt: string;
}): ProviderCredentialRef {
  return {
    id: input.id,
    provider: input.provider,
    keyId: input.keyId,
    createdAt: input.createdAt
  };
}

export function deleteCredential(ref: ProviderCredentialRef, deletedAt: string): ProviderCredentialRef {
  return {
    ...ref,
    deletedAt
  };
}

export function validateProviderCredential(input: ProviderCredentialInput): void {
  if (!input.userId || !input.secret.trim()) {
    throw new Error("Provider credential requires a user and a non-empty secret.");
  }
}
