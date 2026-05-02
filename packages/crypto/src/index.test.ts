import { describe, expect, it } from "vitest";
import { assertCredentialVaultConfigured, describeCredentialVault } from "./index.js";

describe("credential vault scaffold", () => {
  it("rejects placeholder encryption keys", () => {
    expect(() => assertCredentialVaultConfigured("replace-with-strong-random-32-byte-key")).toThrow(
      "Credential encryption key"
    );
  });

  it("documents write-only provider credential handling", () => {
    expect(describeCredentialVault()).toContain("write-only");
  });
});
