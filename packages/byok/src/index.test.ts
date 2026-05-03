import { describe, expect, it } from "vitest";
import {
  createCredentialRef,
  credentialEncryptionContext,
  deleteCredential,
  isSubscriptionOAuthEnabled,
  storeProviderCredential,
  toCredentialResponse,
  validateProviderCredential
} from "./index.js";

describe("BYOK contracts", () => {
  it("keeps subscription OAuth disabled unless explicitly enabled", () => {
    expect(isSubscriptionOAuthEnabled(false)).toBe(false);
    expect(isSubscriptionOAuthEnabled(true)).toBe(true);
  });

  it("creates provider credential refs without exposing secrets", () => {
    const ref = createCredentialRef({
      id: "cred_1",
      provider: "openai",
      keyId: "default-v1",
      createdAt: "2026-05-02T00:00:00.000Z"
    });

    expect(ref).not.toHaveProperty("secret");
    expect(deleteCredential(ref, "2026-05-03T00:00:00.000Z").deletedAt).toBeDefined();
  });

  it("rejects empty provider secrets", () => {
    expect(() => validateProviderCredential({ userId: "user_1", provider: "openai", secret: "" })).toThrow(
      "non-empty secret"
    );
  });

  it("stores BYOK provider credentials as encrypted write-only records", () => {
    const record = storeProviderCredential({
      id: "cred_1",
      createdAt: "2026-05-03T00:00:00.000Z",
      encryptionKey: "0123456789abcdef0123456789abcdef",
      encryptionKeyId: "default-v1",
      crypto: {
        randomBytes(size) {
          return new Uint8Array(size).fill(1);
        },
        encryptAes256Gcm() {
          return { ciphertext: "encrypted", authTag: "tag" };
        }
      },
      credential: {
        userId: "user_1",
        provider: "openai",
        displayName: "Work key",
        secret: "sk-test"
      }
    });

    expect(record.encryptedSecret.ciphertext).not.toContain("sk-test");
    expect(
      credentialEncryptionContext({
        credentialId: record.id,
        userId: record.userId,
        provider: record.provider,
        keyId: record.keyId
      })
    ).toContain("cred_1");
    expect(toCredentialResponse(record)).not.toHaveProperty("encryptedSecret");
  });
});
