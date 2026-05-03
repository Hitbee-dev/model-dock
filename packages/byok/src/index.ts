export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "vllm" | "custom";

export * from "./validation.js";

export type ProviderCredentialCiphertext = {
  keyId: string;
  algorithm: "aes-256-gcm-envelope";
  iv: string;
  authTag: string;
  ciphertext: string;
};

export type ProviderCredentialCrypto = {
  randomBytes(size: number): Uint8Array;
  encryptAes256Gcm(input: { key: string; iv: Uint8Array; plaintext: string; aad: string }): {
    ciphertext: string;
    authTag: string;
  };
};

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

export type ProviderCredentialVaultRecord = StoredProviderCredential & {
  encryptedSecret: ProviderCredentialCiphertext;
};

export function credentialEncryptionContext(input: {
  credentialId: string;
  userId: string;
  provider: ProviderKind;
  keyId: string;
}): string {
  return JSON.stringify({
    credentialId: input.credentialId,
    userId: input.userId,
    provider: input.provider,
    keyId: input.keyId
  });
}

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

export function storeProviderCredential(input: {
  credential: ProviderCredentialInput;
  id: string;
  createdAt: string;
  encryptionKey: string;
  encryptionKeyId: string;
  crypto: ProviderCredentialCrypto;
}): ProviderCredentialVaultRecord {
  validateProviderCredential(input.credential);
  if (!input.encryptionKey || input.encryptionKey.startsWith("replace-with-")) {
    throw new Error("Credential encryption key must be configured before saving provider credentials.");
  }

  const iv = input.crypto.randomBytes(12);
  const encrypted = input.crypto.encryptAes256Gcm({
    key: input.encryptionKey,
    iv,
    plaintext: input.credential.secret,
    aad: credentialEncryptionContext({
      credentialId: input.id,
      userId: input.credential.userId,
      provider: input.credential.provider,
      keyId: input.encryptionKeyId
    })
  });
  const encryptedSecret: ProviderCredentialCiphertext = {
    keyId: input.encryptionKeyId,
    algorithm: "aes-256-gcm-envelope",
    iv: Buffer.from(iv).toString("base64url"),
    authTag: encrypted.authTag,
    ciphertext: encrypted.ciphertext
  };

  return {
    id: input.id,
    userId: input.credential.userId,
    provider: input.credential.provider,
    displayName: input.credential.displayName?.trim() || undefined,
    keyId: encryptedSecret.keyId,
    createdAt: input.createdAt,
    encryptedSecretRef: `provider_credentials/${input.id}`,
    encryptedSecret
  };
}

export function toCredentialResponse(record: ProviderCredentialVaultRecord): ProviderCredentialRef {
  return {
    id: record.id,
    provider: record.provider,
    keyId: record.keyId,
    createdAt: record.createdAt,
    deletedAt: record.deletedAt
  };
}
