import { describe, expect, it } from "vitest";
import {
  createCredentialRef,
  createProviderValidationPlan,
  createSubscriptionRuntimeDefinitions,
  credentialEncryptionContext,
  deleteCredential,
  isSubscriptionOAuthEnabled,
  probeConfiguredSubscriptionRuntimes,
  rotateProviderCredential,
  storeProviderCredential,
  toCredentialResponse,
  validateProviderConnection,
  validateProviderCredential
} from "./index.js";

function testCrypto(ciphertext: string) {
  return {
    randomBytes(size: number) {
      return new Uint8Array(size).fill(1);
    },
    encryptAes256Gcm() {
      return { ciphertext, authTag: "tag" };
    }
  };
}

describe("BYOK contracts", () => {
  it("keeps subscription OAuth disabled unless explicitly enabled", () => {
    expect(isSubscriptionOAuthEnabled(false)).toBe(false);
    expect(isSubscriptionOAuthEnabled(true)).toBe(true);
  });

  it("keeps local subscription runtimes disabled behind explicit flags", () => {
    const runtimes = createSubscriptionRuntimeDefinitions({
      experimentalSubscriptionOAuth: true,
      experimentalChatGPTSubscription: false,
      experimentalClaudeSubscription: false
    });

    expect(runtimes).toMatchObject([
      { id: "codex_local", enabled: false },
      { id: "claude_local", enabled: false }
    ]);
  });

  it("probes local subscription runtimes without returning tokens", async () => {
    const probes = await probeConfiguredSubscriptionRuntimes(
      {
        experimentalSubscriptionOAuth: true,
        experimentalChatGPTSubscription: true,
        experimentalClaudeSubscription: true
      },
      async (command) => ({
        exitCode: command === "codex" ? 0 : 1,
        stdout: command === "codex" ? "Logged in using ChatGPT" : '{"loggedIn": false}',
        stderr: ""
      })
    );

    expect(probes).toMatchObject([
      { id: "codex_local", status: "ready" },
      { id: "claude_local", status: "error" }
    ]);
    expect(JSON.stringify(probes)).not.toContain("refresh");
    expect(JSON.stringify(probes)).not.toContain("access_token");
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
      crypto: testCrypto("encrypted"),
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

  it("rotates provider credentials without exposing old or new secrets", () => {
    const current = storeProviderCredential({
      id: "cred_1",
      createdAt: "2026-05-03T00:00:00.000Z",
      encryptionKey: "0123456789abcdef0123456789abcdef",
      encryptionKeyId: "default-v1",
      crypto: testCrypto("encrypted-old"),
      credential: {
        userId: "user_1",
        provider: "openai",
        displayName: "Work key",
        secret: "sk-test-old"
      }
    });

    const rotated = rotateProviderCredential({
      current,
      secret: "sk-test-new",
      rotatedAt: "2026-05-03T01:00:00.000Z",
      encryptionKey: "abcdef0123456789abcdef0123456789",
      encryptionKeyId: "default-v2",
      crypto: testCrypto("encrypted-new")
    });

    expect(rotated.id).toBe(current.id);
    expect(rotated.encryptedSecretRef).toBe(current.encryptedSecretRef);
    expect(rotated.keyId).toBe("default-v2");
    expect(rotated.rotatedAt).toBe("2026-05-03T01:00:00.000Z");
    expect(rotated.encryptedSecret.ciphertext).toBe("encrypted-new");
    expect(JSON.stringify(toCredentialResponse(rotated))).not.toContain("sk-test-new");
    expect(JSON.stringify(rotated)).not.toContain("sk-test-old");
    expect(JSON.stringify(rotated)).not.toContain("sk-test-new");
  });

  it("refuses to rotate deleted provider credentials", () => {
    const current = storeProviderCredential({
      id: "cred_1",
      createdAt: "2026-05-03T00:00:00.000Z",
      encryptionKey: "0123456789abcdef0123456789abcdef",
      encryptionKeyId: "default-v1",
      crypto: testCrypto("encrypted-old"),
      credential: {
        userId: "user_1",
        provider: "openai",
        secret: "sk-test-old"
      }
    });

    expect(() =>
      rotateProviderCredential({
        current: {
          ...current,
          deletedAt: "2026-05-03T01:00:00.000Z"
        },
        secret: "sk-test-new",
        rotatedAt: "2026-05-03T02:00:00.000Z",
        encryptionKey: "abcdef0123456789abcdef0123456789",
        encryptionKeyId: "default-v2",
        crypto: testCrypto("encrypted-new")
      })
    ).toThrow("Deleted provider credentials");
  });

  it("builds minimal provider validation plans without exposing keys in URLs", () => {
    const plan = createProviderValidationPlan({
      provider: "openai",
      apiKey: "sk-test"
    });

    expect(plan.url).toBe("https://api.openai.com/v1/models");
    expect(plan.url).not.toContain("sk-test");
    expect(plan.headers.authorization).toBe("Bearer sk-test");
  });

  it("requires HTTPS for remote custom validation endpoints", () => {
    expect(() =>
      createProviderValidationPlan({
        provider: "custom",
        apiKey: "token",
        endpoint: "http://api.example.com/v1/models"
      })
    ).toThrow("HTTPS");
  });

  it("validates provider connections through an injected fetch", async () => {
    const result = await validateProviderConnection({
      request: {
        provider: "anthropic",
        apiKey: "anthropic-key"
      },
      async fetch(url, init) {
        expect(url).toBe("https://api.anthropic.com/v1/models");
        expect(init.headers["x-api-key"]).toBe("anthropic-key");
        return { status: 200 };
      }
    });

    expect(result.ok).toBe(true);
  });
});
