export type LiteLLMClientOptions = {
  baseUrl: string;
  masterKey: string;
  fetch: LiteLLMFetch;
};

export type LiteLLMFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type LiteLLMUserCreateResponse = {
  userId: string;
  litellmUserId?: string;
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

export type LiteLLMVirtualKeyCreateRequest = LiteLLMUserCreateRequest & {
  keyAlias: string;
};

export type LiteLLMVirtualKeyCreateResponse = {
  key: string;
  keyAlias: string;
};

export function createLiteLLMHeaders(masterKey: string): Record<string, string> {
  return {
    authorization: `Bearer ${masterKey}`,
    "content-type": "application/json"
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function userPayload(request: LiteLLMUserCreateRequest): Record<string, unknown> {
  return {
    user_id: request.userId,
    max_budget: request.maxBudgetUsd,
    budget_duration: request.budgetDuration,
    models: request.modelAllowlist
  };
}

async function postJson(options: LiteLLMClientOptions, path: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await options.fetch(`${normalizeBaseUrl(options.baseUrl)}${path}`, {
    method: "POST",
    headers: createLiteLLMHeaders(options.masterKey),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`LiteLLM request failed with status ${response.status}.`);
  }

  return response.json();
}

export function createLiteLLMClient(options: LiteLLMClientOptions) {
  return {
    async createUser(request: LiteLLMUserCreateRequest): Promise<LiteLLMUserCreateResponse> {
      await postJson(options, "/user/new", userPayload(request));
      return { userId: request.userId };
    },
    async createVirtualKey(request: LiteLLMVirtualKeyCreateRequest): Promise<LiteLLMVirtualKeyCreateResponse> {
      const body = {
        ...userPayload(request),
        key_alias: request.keyAlias
      };
      const json = (await postJson(options, "/key/generate", body)) as { key?: string };
      if (!json.key) {
        throw new Error("LiteLLM did not return a virtual key.");
      }

      return {
        key: json.key,
        keyAlias: request.keyAlias
      };
    }
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
