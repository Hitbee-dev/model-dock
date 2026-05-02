export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "vllm" | "custom";

export type ProviderCredentialRef = {
  id: string;
  provider: ProviderKind;
  keyId: string;
  createdAt: string;
};

export function isSubscriptionOAuthEnabled(flag: boolean): boolean {
  return flag === true;
}
