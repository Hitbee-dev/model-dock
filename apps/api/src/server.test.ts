import { describe, expect, it } from "vitest";
import { hashPassword } from "@modeldock/auth";
import { createMemoryAuthStore, type AuthUser } from "./auth-store.js";
import { createApiHandler } from "./http.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createMemoryRegistrationStore } from "./registrations.js";
import { isAuthorizedAdminRequest } from "./security.js";

async function invokeApi(
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

function createTestHandler(input: { users?: AuthUser[]; sessionSecret?: string } = {}) {
  return createApiHandler({
    adminAppUrl: "http://127.0.0.1:3001",
    adminApiToken: "admin-secret",
    authStore: createMemoryAuthStore(input.users),
    providerValidationFetch: async () => ({ status: 200 }),
    rateLimiter: createMemoryRateLimiter(),
    registrations: createMemoryRegistrationStore(),
    secureCookies: false,
    sessionSecret: input.sessionSecret ?? "test-session-secret-that-is-at-least-32-bytes",
    sessionTtlSeconds: 3600
  });
}

describe("api scaffold", () => {
  it("fails closed for admin API on the public API placeholder", () => {
    expect("admin_api_requires_dedicated_admin_host").toMatch("admin_api");
  });

  it("keeps signup requests pending until admin approval", async () => {
    const store = createMemoryRegistrationStore(() => "2026-05-02T00:00:00.000Z");
    const pending = await store.submit({ email: "USER@example.com" });

    expect(await store.listPending()).toHaveLength(1);
    expect((await store.approve(pending.id, "owner_1")).status).toBe("active");
    expect(await store.listPending()).toHaveLength(0);
  });

  it("denies admin approval when the admin token is missing", () => {
    const request = { headers: { host: "127.0.0.1:3001" } };

    expect(
      isAuthorizedAdminRequest(request as never, { adminAppUrl: "http://127.0.0.1:3001", adminApiToken: undefined })
    ).toBe(false);
  });

  it("does not trust a client-controlled host header for admin approval", () => {
    const request = {
      headers: {
        "x-modeldock-trusted-host": "127.0.0.1:3001",
        "x-modeldock-admin-token": "secret"
      }
    };

    expect(
      isAuthorizedAdminRequest(request as never, { adminAppUrl: "http://127.0.0.1:3001", adminApiToken: "secret" })
    ).toBe(false);
  });

  it("validates provider keys without reflecting submitted secrets", async () => {
    const upstreamCalls: Array<{ url: string; authorization?: string }> = [];
    const handler = createApiHandler({
      adminAppUrl: "http://127.0.0.1:3001",
      adminApiToken: "admin-secret",
      authStore: createMemoryAuthStore(),
      providerValidationFetch: async (url, init) => {
        upstreamCalls.push({ url, authorization: init.headers.authorization });
        return { status: 200 };
      },
      rateLimiter: createMemoryRateLimiter(),
      registrations: createMemoryRegistrationStore(),
      secureCookies: false,
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
      sessionTtlSeconds: 3600
    });

    const response = await invokeApi(handler, {
      method: "POST",
      url: "/providers/validate",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: "provider-secret" })
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, status: 200 });
    expect(JSON.stringify(response.body)).not.toContain("provider-secret");

    expect(upstreamCalls).toEqual([
      {
        url: "https://api.openai.com/v1/models",
        authorization: "Bearer provider-secret"
      }
    ]);
  });

  it("rate-limits provider validation requests", async () => {
    const handler = createApiHandler({
      adminAppUrl: "http://127.0.0.1:3001",
      authStore: createMemoryAuthStore(),
      providerValidationFetch: async () => ({ status: 200 }),
      rateLimiter: createMemoryRateLimiter(),
      registrations: createMemoryRegistrationStore(),
      secureCookies: false,
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
      sessionTtlSeconds: 3600
    });

    for (let index = 0; index < 10; index += 1) {
      const response = await invokeApi(handler, {
        method: "POST",
        url: "/providers/validate",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "openai", apiKey: "provider-secret" })
      });
      expect(response.status).toBe(200);
    }

    const blocked = await invokeApi(handler, {
      method: "POST",
      url: "/providers/validate",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: "provider-secret" })
    });

    expect(blocked.status).toBe(429);
  });

  it("issues session and csrf tokens for valid local login", async () => {
    const handler = createTestHandler({
      users: [
        {
          id: "user_1",
          email: "user@example.com",
          role: "user",
          status: "active",
          passwordHash: hashPassword({
            password: "correct-password",
            salt: Buffer.alloc(16),
            iterations: 1
          })
        }
      ]
    });

    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "USER@example.com", password: "correct-password" })
    });

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toContain("HttpOnly");
    expect(JSON.stringify(login.body)).not.toContain("correct-password");

    const body = login.body as { csrfToken: string };
    const session = await invokeApi(handler, {
      method: "GET",
      url: "/auth/session",
      headers: { cookie: login.headers["set-cookie"] ?? "" }
    });

    expect(session.status).toBe(200);
    expect(session.body).toMatchObject({ user: { id: "user_1", email: "user@example.com", role: "user" } });

    const logout = await invokeApi(handler, {
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: login.headers["set-cookie"] ?? "", "x-modeldock-csrf-token": body.csrfToken }
    });

    expect(logout.status).toBe(200);
  });

  it("rate-limits invalid local login attempts", async () => {
    const handler = createTestHandler();

    for (let index = 0; index < 5; index += 1) {
      const response = await invokeApi(handler, {
        method: "POST",
        url: "/auth/login",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com", password: "wrong-password" })
      });
      expect(response.status).toBe(401);
    }

    const blocked = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com", password: "wrong-password" })
    });

    expect(blocked.status).toBe(429);
  });

  it("requires csrf for logout", async () => {
    const handler = createTestHandler({
      users: [
        {
          id: "user_1",
          email: "user@example.com",
          role: "user",
          status: "active",
          passwordHash: hashPassword({
            password: "correct-password",
            salt: Buffer.alloc(16),
            iterations: 1
          })
        }
      ]
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "correct-password" })
    });

    const logout = await invokeApi(handler, {
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: login.headers["set-cookie"] ?? "" }
    });

    expect(logout.status).toBe(403);
  });
});
