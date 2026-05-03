import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createSessionTokenPair,
  renderSessionCookie,
  verifyPassword,
  verifyTokenHash,
  type PasswordHash
} from "@modeldock/auth";
import { validateProviderConnection, type ProviderKind, type ProviderValidationFetch } from "@modeldock/byok";
import type { AuthStore } from "./auth-store.js";
import { streamLiteLLMChat, type ChatCompletionStreamFetch } from "./chat-stream.js";
import { headerValue, parseCookies, readBody, readInput, sendJson } from "./http-utils.js";
import { authorizeAdminRequest, isAdminHost } from "./security.js";
import type { AdminGuardOptions } from "./security.js";
import type { RateLimiter } from "./rate-limit.js";
import type { RegistrationStore } from "./registrations.js";

export type ApiHandlerOptions = AdminGuardOptions & {
  authStore: AuthStore;
  chatCompletionFetch: ChatCompletionStreamFetch;
  litellmBaseUrl?: string;
  litellmMasterKey?: string;
  providerValidationFetch: ProviderValidationFetch;
  rateLimiter: RateLimiter;
  registrations: RegistrationStore;
  secureCookies: boolean;
  sessionSecret?: string;
  sessionTtlSeconds: number;
};

const providerKinds = new Set<ProviderKind>(["openai", "anthropic", "gemini", "openrouter", "ollama", "vllm", "custom"]);
const sessionCookieName = "modeldock_session";
const csrfHeaderName = "x-modeldock-csrf-token";
const dummyPasswordHash: PasswordHash = {
  algorithm: "pbkdf2-sha256",
  iterations: 210_000,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  hash: "UzoWV9uLV0zG2RzhrpMrxINuXNNlOy3XEpcnLej_JV8"
};

function clientKey(request: IncomingMessage, action: string): string {
  return `${action}:${request.socket.remoteAddress ?? "unknown"}`;
}

function parseProvider(value: string | undefined): ProviderKind {
  if (!value || !providerKinds.has(value as ProviderKind)) {
    throw new Error("Unsupported provider.");
  }

  return value as ProviderKind;
}

function requireSessionSecret(options: ApiHandlerOptions): string {
  if (!options.sessionSecret || options.sessionSecret.startsWith("replace-with-")) {
    throw new Error("Session secret must be configured.");
  }

  return options.sessionSecret;
}

async function getCurrentSession(request: IncomingMessage, options: ApiHandlerOptions) {
  const token = parseCookies(request).get(sessionCookieName);
  if (!token) {
    return undefined;
  }

  return options.authStore.findSessionByToken({
    token,
    sessionSecret: requireSessionSecret(options),
    now: new Date()
  });
}

export function createApiHandler(options: ApiHandlerOptions) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      if (request.url === "/healthz") {
        sendJson(response, 200, { service: "modeldock-api", status: "ok" });
        return;
      }

      if (request.method === "POST" && request.url === "/auth/signup") {
        const decision = options.rateLimiter.allow(clientKey(request, "signup"), {
          limit: 5,
          windowSeconds: 300
        });
        if (!decision.allowed) {
          sendJson(response, 429, { error: "rate_limited", resetAt: decision.resetAt });
          return;
        }

        const body = await readInput(request);
        const registration = await options.registrations.submit({ email: body.email ?? "", displayName: body.displayName });
        sendJson(response, 202, { registrationId: registration.id, status: registration.status });
        return;
      }

      if (request.method === "POST" && request.url === "/auth/login") {
        const decision = options.rateLimiter.allow(clientKey(request, "login"), {
          limit: 5,
          windowSeconds: 300
        });
        if (!decision.allowed) {
          sendJson(response, 429, { error: "rate_limited", resetAt: decision.resetAt });
          return;
        }

        const body = await readInput(request);
        const user = await options.authStore.findActiveUserByEmail(body.email ?? "");
        const password = body.password ?? "";
        const passwordHash = user?.passwordHash ?? dummyPasswordHash;
        if (!user || !verifyPassword({ password, stored: passwordHash })) {
          sendJson(response, 401, { error: "invalid_login" });
          return;
        }

        const tokenPair = createSessionTokenPair({
          sessionSecret: requireSessionSecret(options),
          now: new Date(),
          ttlSeconds: options.sessionTtlSeconds
        });
        await options.authStore.saveSession({
          id: `sess_${crypto.randomUUID()}`,
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionTokenHash: tokenPair.sessionTokenHash,
          csrfTokenHash: tokenPair.csrfTokenHash,
          expiresAt: tokenPair.expiresAt
        });

        sendJson(
          response,
          200,
          {
            user: { id: user.id, email: user.email, role: user.role },
            csrfToken: tokenPair.csrfToken,
            expiresAt: tokenPair.expiresAt
          },
          {
            "set-cookie": renderSessionCookie({
              name: sessionCookieName,
              token: tokenPair.sessionToken,
              expiresAt: tokenPair.expiresAt,
              secure: options.secureCookies
            })
          }
        );
        return;
      }

      if (request.method === "GET" && request.url === "/auth/session") {
        const session = await getCurrentSession(request, options);
        if (!session) {
          sendJson(response, 401, { error: "not_authenticated" });
          return;
        }

        sendJson(response, 200, {
          user: { id: session.userId, email: session.email, role: session.role },
          expiresAt: session.expiresAt
        });
        return;
      }

      if (request.method === "POST" && request.url === "/auth/logout") {
        const session = await getCurrentSession(request, options);
        const csrfToken = headerValue(request.headers[csrfHeaderName]);
        if (
          !session ||
          !csrfToken ||
          !verifyTokenHash({
            token: csrfToken,
            expectedHash: session.csrfTokenHash,
            secret: requireSessionSecret(options)
          })
        ) {
          sendJson(response, 403, { error: "csrf_required" });
          return;
        }

        await options.authStore.deleteSession(session.id);
        sendJson(response, 200, { status: "signed_out" });
        return;
      }

      if (request.method === "POST" && request.url === "/providers/validate") {
        const decision = options.rateLimiter.allow(clientKey(request, "provider-validation"), {
          limit: 10,
          windowSeconds: 300
        });
        if (!decision.allowed) {
          sendJson(response, 429, { error: "rate_limited", resetAt: decision.resetAt });
          return;
        }

        const body = await readInput(request);
        const result = await validateProviderConnection({
          fetch: options.providerValidationFetch,
          request: {
            provider: parseProvider(body.provider),
            apiKey: body.apiKey ?? "",
            endpoint: body.endpoint
          }
        });
        sendJson(response, 200, result);
        return;
      }

      if (request.method === "POST" && request.url === "/chat/stream") {
        const session = await getCurrentSession(request, options);
        if (!session) {
          sendJson(response, 401, { error: "not_authenticated" });
          return;
        }

        const decision = options.rateLimiter.allow(clientKey(request, "chat-stream"), {
          limit: 30,
          windowSeconds: 60
        });
        if (!decision.allowed) {
          sendJson(response, 429, { error: "rate_limited", resetAt: decision.resetAt });
          return;
        }

        await streamLiteLLMChat({ config: options, rawBody: await readBody(request), response, userId: session.userId });
        return;
      }

      if (request.url?.startsWith("/admin") && !isAdminHost(request, options.adminAppUrl)) {
        sendJson(response, 404, { error: "admin_api_requires_dedicated_admin_host" });
        return;
      }

      if (request.method === "GET" && request.url === "/admin/approvals") {
        if (!(await authorizeAdminRequest(request, options))) {
          sendJson(response, 403, { error: "admin_approval_requires_admin_host_and_token" });
          return;
        }
        sendJson(response, 200, { pending: await options.registrations.listPending() });
        return;
      }

      if (request.method === "POST" && request.url?.startsWith("/admin/approvals/")) {
        if (!(await authorizeAdminRequest(request, options))) {
          sendJson(response, 403, { error: "admin_approval_requires_admin_host_and_token" });
          return;
        }
        const id = request.url.split("/").at(3) ?? "";
        sendJson(response, 200, { user: await options.registrations.approve(id, "admin") });
        return;
      }

      sendJson(response, 200, { service: "modeldock-api", status: "placeholder" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected API error.";
      const isValidationError = message === "A valid email address is required.";
      sendJson(response, 400, { error: isValidationError ? message : "Invalid request." });
    }
  };
}
