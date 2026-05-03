import { createMemoryAuthStore, type AuthStore, type AuthUser } from "./auth-store.js";
import type { ChatCompletionStreamFetch, ChatRagRetriever } from "./chat-stream.js";
import { createApiHandler } from "./http.js";
import {
  createMemoryRagDocumentStore,
  type RagDocumentStore,
  type RagObjectDeletionClient,
  type RagVectorDeletionClient
} from "./rag-documents.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createMemoryRegistrationStore, type RegistrationStore } from "./registrations.js";
import type { ProviderValidationFetch } from "@modeldock/byok";
import type { SubscriptionRuntimeCommandRunner, SubscriptionRuntimeConfig } from "@modeldock/byok";

async function* streamChunks(chunks: string[]): AsyncIterable<string> {
  yield* chunks;
}

export async function invokeApi(
  handler: ReturnType<typeof createApiHandler>,
  input: { method: string; url: string; headers?: Record<string, string>; body?: string; remoteAddress?: string }
): Promise<{ status: number; body: unknown; rawBody: string; headers: Record<string, string> }> {
  let status = 0;
  let rawBody = "";
  let responseHeaders: Record<string, string> = {};
  const request = {
    method: input.method,
    url: input.url,
    headers: input.headers ?? {},
    socket: { remoteAddress: input.remoteAddress ?? "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      if (input.body) {
        yield Buffer.from(input.body);
      }
    }
  };
  const response = {
    writeHead(nextStatus: number, headers: Record<string, string>) {
      status = nextStatus;
      responseHeaders = headers;
    },
    write(chunk: string) {
      rawBody += chunk;
    },
    end(body: string) {
      rawBody += body ?? "";
    }
  };

  await handler(request as never, response as never);
  return {
    status,
    body: responseHeaders["content-type"] === "application/json" ? (JSON.parse(rawBody) as unknown) : undefined,
    rawBody,
    headers: responseHeaders
  };
}

export function createTestHandler(
  input: {
    accessMode?: "debug" | "release";
    users?: AuthUser[];
    authStore?: AuthStore;
    sessionSecret?: string;
    subscriptionRuntimeConfig?: SubscriptionRuntimeConfig;
    subscriptionRuntimeRunner?: SubscriptionRuntimeCommandRunner;
    providerValidationFetch?: ProviderValidationFetch;
    chatCompletionFetch?: ChatCompletionStreamFetch;
    ragDocumentStore?: RagDocumentStore;
    ragObjectStorage?: RagObjectDeletionClient;
    ragRetriever?: ChatRagRetriever;
    ragVectorStore?: RagVectorDeletionClient;
    registrations?: RegistrationStore;
  } = {}
) {
  return createApiHandler({
    accessMode: input.accessMode ?? "debug",
    adminAppUrl: "http://127.0.0.1:3001",
    adminApiToken: "admin-secret",
    authStore: input.authStore ?? createMemoryAuthStore(input.users),
    chatCompletionFetch:
      input.chatCompletionFetch ??
      (async () => ({ ok: true, status: 200, body: streamChunks([": no stream configured\n", "data: [DONE]\n"]) })),
    litellmBaseUrl: "http://litellm.test",
    litellmMasterKey: "test-litellm-master-key",
    providerValidationFetch: input.providerValidationFetch ?? (async () => ({ status: 200 })),
    ragDocumentStore: input.ragDocumentStore ?? createMemoryRagDocumentStore(),
    ragObjectStorage: input.ragObjectStorage,
    ragRetriever: input.ragRetriever,
    ragVectorStore: input.ragVectorStore,
    rateLimiter: createMemoryRateLimiter(),
    registrations: input.registrations ?? createMemoryRegistrationStore(),
    secureCookies: false,
    sessionSecret: input.sessionSecret ?? "test-session-secret-that-is-at-least-32-bytes",
    sessionTtlSeconds: 3600,
    subscriptionRuntimeConfig: input.subscriptionRuntimeConfig,
    subscriptionRuntimeRunner: input.subscriptionRuntimeRunner
  });
}
