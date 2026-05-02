import { describe, expect, it } from "vitest";
import { createCredentialRef, deleteCredential, isSubscriptionOAuthEnabled, validateProviderCredential } from "./index.js";

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
});
