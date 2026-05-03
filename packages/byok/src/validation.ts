import type { ProviderKind } from "./index.js";

export type ProviderValidationRequest = {
  provider: ProviderKind;
  apiKey: string;
  endpoint?: string;
};

export type ProviderValidationPlan = {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
  expectedStatus: number[];
};

const defaultEndpoints: Record<ProviderKind, string> = {
  openai: "https://api.openai.com/v1/models",
  anthropic: "https://api.anthropic.com/v1/models",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  ollama: "http://127.0.0.1:11434/api/tags",
  vllm: "http://127.0.0.1:8000/v1/models",
  custom: ""
};

function assertNoNewlines(value: string, label: string): void {
  if (/[\r\n]/.test(value)) {
    throw new Error(`${label} cannot contain newlines.`);
  }
}

function endpointFor(request: ProviderValidationRequest): string {
  const endpoint = request.endpoint?.trim() || defaultEndpoints[request.provider];
  if (!endpoint) {
    throw new Error("Custom provider validation requires an endpoint.");
  }

  const parsed = new URL(endpoint);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Provider validation endpoint must use HTTP or HTTPS.");
  }
  if (request.provider !== "ollama" && request.provider !== "vllm" && parsed.protocol !== "https:") {
    throw new Error("Remote provider validation endpoints must use HTTPS.");
  }

  return parsed.toString();
}

export function createProviderValidationPlan(request: ProviderValidationRequest): ProviderValidationPlan {
  const apiKey = request.apiKey.trim();
  if (!apiKey) {
    throw new Error("Provider validation requires a non-empty API key.");
  }
  assertNoNewlines(apiKey, "Provider API key");

  const url = endpointFor(request);
  if (request.provider === "gemini") {
    return {
      method: "GET",
      url,
      headers: { "x-goog-api-key": apiKey },
      expectedStatus: [200]
    };
  }
  if (request.provider === "anthropic") {
    return {
      method: "GET",
      url,
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey
      },
      expectedStatus: [200]
    };
  }

  return {
    method: "GET",
    url,
    headers: {
      authorization: `Bearer ${apiKey}`
    },
    expectedStatus: [200]
  };
}

export type ProviderValidationFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<{ status: number }>;

export async function validateProviderConnection(input: {
  request: ProviderValidationRequest;
  fetch: ProviderValidationFetch;
}): Promise<{ ok: boolean; status: number }> {
  const plan = createProviderValidationPlan(input.request);
  const response = await input.fetch(plan.url, {
    method: plan.method,
    headers: plan.headers
  });

  return {
    ok: plan.expectedStatus.includes(response.status),
    status: response.status
  };
}

