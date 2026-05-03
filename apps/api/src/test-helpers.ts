import { createMemoryAuthStore, type AuthUser } from "./auth-store.js";
import { createApiHandler } from "./http.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createMemoryRegistrationStore } from "./registrations.js";
import type { ProviderValidationFetch } from "@modeldock/byok";

export async function invokeApi(
  handler: ReturnType<typeof createApiHandler>,
  input: { method: string; url: string; headers?: Record<string, string>; body?: string; remoteAddress?: string }
): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
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
    end(body: string) {
      rawBody = body;
    }
  };

  await handler(request as never, response as never);
  return { status, body: JSON.parse(rawBody) as unknown, headers: responseHeaders };
}

export function createTestHandler(
  input: { users?: AuthUser[]; sessionSecret?: string; providerValidationFetch?: ProviderValidationFetch } = {}
) {
  return createApiHandler({
    adminAppUrl: "http://127.0.0.1:3001",
    adminApiToken: "admin-secret",
    authStore: createMemoryAuthStore(input.users),
    providerValidationFetch: input.providerValidationFetch ?? (async () => ({ status: 200 })),
    rateLimiter: createMemoryRateLimiter(),
    registrations: createMemoryRegistrationStore(),
    secureCookies: false,
    sessionSecret: input.sessionSecret ?? "test-session-secret-that-is-at-least-32-bytes",
    sessionTtlSeconds: 3600
  });
}
