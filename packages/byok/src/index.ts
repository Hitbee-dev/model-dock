export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "vllm" | "custom";

export {
  createProviderValidationPlan,
  validateProviderConnection
} from "./validation.js";
export type {
  ProviderValidationFetch,
  ProviderValidationPlan,
  ProviderValidationRequest
} from "./validation.js";
export {
  createSubscriptionRuntimeDefinitions,
  invokeConfiguredSubscriptionRuntime,
  probeConfiguredSubscriptionRuntimes,
  probeSubscriptionRuntime
} from "./subscription-runtimes.js";
export type {
  SubscriptionRuntimeCommandRunner,
  SubscriptionRuntimeCommandOptions,
  SubscriptionRuntimeConfig,
  SubscriptionRuntimeDefinition,
  SubscriptionRuntimeId,
  SubscriptionRuntimeInvocationInput,
  SubscriptionRuntimeInvocationResult,
  SubscriptionRuntimeProbe,
  SubscriptionRuntimeStatus
} from "./subscription-runtimes.js";

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
  rotatedAt?: string;
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

function assertUsableEncryptionKey(key: string): void {
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("Credential encryption key must be configured before saving provider credentials.");
  }
}

function encryptProviderSecret(input: {
  credentialId: string;
  userId: string;
  provider: ProviderKind;
  secret: string;
  encryptionKey: string;
  encryptionKeyId: string;
  crypto: ProviderCredentialCrypto;
}): ProviderCredentialCiphertext {
  assertUsableEncryptionKey(input.encryptionKey);
  const iv = input.crypto.randomBytes(12);
  const encrypted = input.crypto.encryptAes256Gcm({
    key: input.encryptionKey,
    iv,
    plaintext: input.secret,
    aad: credentialEncryptionContext({
      credentialId: input.credentialId,
      userId: input.userId,
      provider: input.provider,
      keyId: input.encryptionKeyId
    })
  });

  return {
    keyId: input.encryptionKeyId,
    algorithm: "aes-256-gcm-envelope",
    iv: Buffer.from(iv).toString("base64url"),
    authTag: encrypted.authTag,
    ciphertext: encrypted.ciphertext
  };
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
  const encryptedSecret = encryptProviderSecret({
    credentialId: input.id,
    userId: input.credential.userId,
    provider: input.credential.provider,
    secret: input.credential.secret,
    encryptionKey: input.encryptionKey,
    encryptionKeyId: input.encryptionKeyId,
    crypto: input.crypto
  });

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

export function rotateProviderCredential(input: {
  current: ProviderCredentialVaultRecord;
  secret: string;
  rotatedAt: string;
  encryptionKey: string;
  encryptionKeyId: string;
  crypto: ProviderCredentialCrypto;
}): ProviderCredentialVaultRecord {
  if (input.current.deletedAt) {
    throw new Error("Deleted provider credentials cannot be rotated.");
  }
  validateProviderCredential({
    userId: input.current.userId,
    provider: input.current.provider,
    secret: input.secret
  });

  const encryptedSecret = encryptProviderSecret({
    credentialId: input.current.id,
    userId: input.current.userId,
    provider: input.current.provider,
    secret: input.secret,
    encryptionKey: input.encryptionKey,
    encryptionKeyId: input.encryptionKeyId,
    crypto: input.crypto
  });

  return {
    ...input.current,
    keyId: encryptedSecret.keyId,
    rotatedAt: input.rotatedAt,
    encryptedSecret
  };
}

export function toCredentialResponse(record: ProviderCredentialVaultRecord): ProviderCredentialRef {
  return {
    id: record.id,
    provider: record.provider,
    keyId: record.keyId,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    deletedAt: record.deletedAt
  };
}
