export type LiteLLMClientOptions = {
  baseUrl: string;
  masterKey: string;
};

export type LiteLLMUserCreateRequest = {
  userId: string;
  maxBudgetUsd?: number;
  budgetDuration?: string;
  modelAllowlist?: string[];
};

export type LiteLLMRouteConfig = {
  modelName: string;
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "vllm" | "custom";
  apiBase?: string;
  credentialRef?: string;
};

export function createLiteLLMHeaders(masterKey: string): Record<string, string> {
  return {
    authorization: `Bearer ${masterKey}`,
    "content-type": "application/json"
  };
}

export function renderLiteLLMConfig(routes: LiteLLMRouteConfig[]): string {
  const modelList = routes
    .map((route) => {
      const params = [`model: ${route.provider}/${route.modelName}`];
      if (route.apiBase) {
        params.push(`api_base: ${route.apiBase}`);
      }
      if (route.credentialRef) {
        params.push(`api_key: os.environ/${route.credentialRef}`);
      }
      return [`  - model_name: ${route.modelName}`, "    litellm_params:", ...params.map((param) => `      ${param}`)].join("\n");
    })
    .join("\n");

  return `model_list:\n${modelList || "  []"}\n`;
}
