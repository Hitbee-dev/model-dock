import { createCipheriv, createDecipheriv, randomBytes as nodeRandomBytes } from "node:crypto";

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
  encryptAes256Gcm(input: { key: string; iv: Uint8Array; plaintext: string; aad?: string }): {
    ciphertext: string;
    authTag: string;
  };
  decryptAes256Gcm?(input: {
    key: string;
    iv: Uint8Array;
    ciphertext: string;
    authTag: string;
    aad?: string;
  }): string;
};

function keyBuffer(key: string): Buffer {
  const raw = Buffer.from(key, "utf8");
  if (raw.byteLength !== 32) {
    throw new Error("Credential encryption key must be exactly 32 bytes.");
  }
  return raw;
}

export function createNodeCredentialCrypto(): Required<CredentialVaultCrypto> {
  return {
    randomBytes(size) {
      return nodeRandomBytes(size);
    },
    encryptAes256Gcm(input) {
      const cipher = createCipheriv("aes-256-gcm", keyBuffer(input.key), Buffer.from(input.iv));
      if ("aad" in input && typeof input.aad === "string") {
        cipher.setAAD(Buffer.from(input.aad, "utf8"));
      }
      const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
      return {
        ciphertext: ciphertext.toString("base64url"),
        authTag: cipher.getAuthTag().toString("base64url")
      };
    },
    decryptAes256Gcm(input) {
      const decipher = createDecipheriv("aes-256-gcm", keyBuffer(input.key), Buffer.from(input.iv));
      if (input.aad) {
        decipher.setAAD(Buffer.from(input.aad, "utf8"));
      }
      decipher.setAuthTag(Buffer.from(input.authTag, "base64url"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(input.ciphertext, "base64url")),
        decipher.final()
      ]);
      return plaintext.toString("utf8");
    }
  };
}

export function encryptCredential(input: {
  plaintext: string;
  key: string;
  keyId: string;
  aad?: string;
  crypto: CredentialVaultCrypto;
}): CredentialCiphertext {
  assertCredentialVaultConfigured(input.key);

  const iv = input.crypto.randomBytes(12);
  const encrypted = input.crypto.encryptAes256Gcm({
    key: input.key,
    iv,
    plaintext: input.plaintext,
    aad: input.aad
  });

  return {
    keyId: input.keyId,
    algorithm: "aes-256-gcm-envelope",
    iv: Buffer.from(iv).toString("base64url"),
    authTag: encrypted.authTag,
    ciphertext: encrypted.ciphertext
  };
}

export function decryptCredential(input: {
  ciphertext: CredentialCiphertext;
  key: string;
  expectedKeyId?: string;
  aad?: string;
  crypto: CredentialVaultCrypto;
}): string {
  assertCredentialVaultConfigured(input.key);
  if (input.ciphertext.algorithm !== "aes-256-gcm-envelope") {
    throw new Error("Unsupported credential ciphertext algorithm.");
  }
  if (input.expectedKeyId && input.ciphertext.keyId !== input.expectedKeyId) {
    throw new Error("Credential ciphertext key id does not match.");
  }
  if (!input.crypto.decryptAes256Gcm) {
    throw new Error("Credential crypto adapter does not support decryption.");
  }

  return input.crypto.decryptAes256Gcm({
    key: input.key,
    iv: Buffer.from(input.ciphertext.iv, "base64url"),
    ciphertext: input.ciphertext.ciphertext,
    authTag: input.ciphertext.authTag,
    aad: input.aad
  });
}

export function redactCiphertext(ciphertext: CredentialCiphertext): Omit<CredentialCiphertext, "ciphertext" | "authTag"> {
  return {
    keyId: ciphertext.keyId,
    algorithm: ciphertext.algorithm,
    iv: ciphertext.iv
  };
}
