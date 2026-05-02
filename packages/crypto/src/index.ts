export type CredentialCiphertext = {
  keyId: string;
  algorithm: "aes-256-gcm-envelope";
  iv: string;
  authTag: string;
  ciphertext: string;
};

export function assertCredentialVaultConfigured(key: string): void {
  if (!key || key.startsWith("replace-with-")) {
    throw new Error("Credential encryption key must be configured before saving provider credentials.");
  }
}

export function describeCredentialVault(): string {
  return "Provider credentials are write-only to the browser and must be encrypted at rest with environment-scoped key material.";
}

export type CredentialVaultCrypto = {
  randomBytes(size: number): Uint8Array;
  encryptAes256Gcm(input: { key: string; iv: Uint8Array; plaintext: string }): {
    ciphertext: string;
    authTag: string;
  };
};

export function encryptCredential(input: {
  plaintext: string;
  key: string;
  keyId: string;
  crypto: CredentialVaultCrypto;
}): CredentialCiphertext {
  assertCredentialVaultConfigured(input.key);

  const iv = input.crypto.randomBytes(12);
  const encrypted = input.crypto.encryptAes256Gcm({
    key: input.key,
    iv,
    plaintext: input.plaintext
  });

  return {
    keyId: input.keyId,
    algorithm: "aes-256-gcm-envelope",
    iv: Buffer.from(iv).toString("base64url"),
    authTag: encrypted.authTag,
    ciphertext: encrypted.ciphertext
  };
}

export function redactCiphertext(ciphertext: CredentialCiphertext): Omit<CredentialCiphertext, "ciphertext" | "authTag"> {
  return {
    keyId: ciphertext.keyId,
    algorithm: ciphertext.algorithm,
    iv: ciphertext.iv
  };
}
