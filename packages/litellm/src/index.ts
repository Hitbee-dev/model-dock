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

export type LiteLLMProvisioningPlan = {
  user: LiteLLMUserCreateRequest;
  virtualKey: LiteLLMVirtualKeyCreateRequest;
};

function assertServerRuntime(): void {
  if (typeof (globalThis as { window?: unknown }).window !== "undefined") {
    throw new Error("LiteLLM secret-bearing helpers can only run on the server.");
  }
}

function yamlScalar(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error("LiteLLM config values cannot contain newlines.");
  }
  return JSON.stringify(value);
}

function validateCredentialRef(value: string): string {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    throw new Error("Invalid LiteLLM credential environment reference.");
  }
  return value;
}

export function createLiteLLMHeaders(masterKey: string): Record<string, string> {
  assertServerRuntime();
  return {
    authorization: `Bearer ${masterKey}`,
    "content-type": "application/json"
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function userPayload(request: LiteLLMUserCreateRequest): Record<string, unknown> {
  if (request.modelAllowlist && request.modelAllowlist.length === 0) {
    throw new Error("LiteLLM model allowlist cannot be empty.");
  }

  return {
    user_id: request.userId,
    max_budget: request.maxBudgetUsd,
    budget_duration: request.budgetDuration,
    models: request.modelAllowlist
  };
}

export function createModelAllowlist(models: string[]): string[] {
  const unique = [...new Set(models.map((model) => model.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("At least one model must be allowed.");
  }

  return unique;
}

export function createLiteLLMProvisioningPlan(input: {
  userId: string;
  keyAlias?: string;
  maxBudgetUsd?: number;
  budgetDuration?: string;
  modelAllowlist: string[];
}): LiteLLMProvisioningPlan {
  const modelAllowlist = createModelAllowlist(input.modelAllowlist);
  const user = {
    userId: input.userId,
    maxBudgetUsd: input.maxBudgetUsd,
    budgetDuration: input.budgetDuration,
    modelAllowlist
  };

  return {
    user,
    virtualKey: {
      ...user,
      keyAlias: input.keyAlias ?? `${input.userId}-default`
    }
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
    },
    async provisionUserAccess(plan: LiteLLMProvisioningPlan): Promise<LiteLLMVirtualKeyCreateResponse> {
      await this.createUser(plan.user);
      return this.createVirtualKey(plan.virtualKey);
    }
  };
}

export function renderLiteLLMConfig(routes: LiteLLMRouteConfig[]): string {
  const modelList = routes
    .map((route) => {
      const params = [`model: ${yamlScalar(`${route.provider}/${route.modelName}`)}`];
      if (route.apiBase) {
        params.push(`api_base: ${yamlScalar(new URL(route.apiBase).toString())}`);
      }
      if (route.credentialRef) {
        params.push(`api_key: os.environ/${validateCredentialRef(route.credentialRef)}`);
      }
      return [`  - model_name: ${yamlScalar(route.modelName)}`, "    litellm_params:", ...params.map((param) => `      ${param}`)].join("\n");
    })
    .join("\n");

  return `model_list:\n${modelList || "  []"}\n`;
}
