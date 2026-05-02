import { describe, expect, it } from "vitest";
import { assertCredentialVaultConfigured, describeCredentialVault, encryptCredential, redactCiphertext } from "./index.js";

describe("credential vault scaffold", () => {
  it("rejects placeholder encryption keys", () => {
    expect(() => assertCredentialVaultConfigured("replace-with-strong-random-32-byte-key")).toThrow(
      "Credential encryption key"
    );
  });

  it("documents write-only provider credential handling", () => {
    expect(describeCredentialVault()).toContain("write-only");
  });

  it("redacts encrypted provider secrets", () => {
    const encrypted = encryptCredential({
      plaintext: "provider-key",
      key: "0123456789abcdef0123456789abcdef",
      keyId: "default-v1",
      crypto: {
        randomBytes(size) {
          return new Uint8Array(size).fill(1);
        },
        encryptAes256Gcm() {
          return { ciphertext: "encrypted", authTag: "tag" };
        }
      }
    });

    expect(encrypted.algorithm).toBe("aes-256-gcm-envelope");
    expect(redactCiphertext(encrypted)).not.toHaveProperty("ciphertext");
  });
});
