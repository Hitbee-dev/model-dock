export type CredentialCiphertext = {
  keyId: string;
  algorithm: "placeholder-envelope-encryption";
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
