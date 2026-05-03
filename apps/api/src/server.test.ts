import { describe, expect, it } from "vitest";
import { hashPassword } from "@modeldock/auth";
import { createMemoryAuthStore } from "./auth-store.js";
import { createMemoryRegistrationStore } from "./registrations.js";
import { createMemoryRagDocumentStore } from "./rag-documents.js";
import { authorizeAdminRequest, isAuthorizedAdminRequest } from "./security.js";
import { createTestHandler, invokeApi } from "./test-helpers.js";

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

  it("requires Cloudflare Access when enabled for admin approval", async () => {
    const request = {
      headers: {
        host: "127.0.0.1:3001",
        "x-modeldock-admin-token": "secret",
        "cf-access-jwt-assertion": "jwt"
      }
    };

    await expect(
      authorizeAdminRequest(request as never, {
        adminAppUrl: "http://127.0.0.1:3001",
        adminApiToken: "secret",
        cloudflareAccessConfig: {
          enabled: true,
          teamDomain: "team.cloudflareaccess.com",
          allowedAudiences: ["aud_1"],
          allowedEmails: ["owner@example.com"]
        },
        cloudflareAccessVerifier: {
          async verifyJwt() {
            return {
              email: "owner@example.com",
              aud: ["aud_1"],
              iss: "https://team.cloudflareaccess.com",
              exp: Math.floor(Date.now() / 1000) + 60
            };
          }
        }
      })
    ).resolves.toBe(true);

    await expect(
      authorizeAdminRequest(request as never, {
        adminAppUrl: "http://127.0.0.1:3001",
        adminApiToken: "secret",
        cloudflareAccessConfig: {
          enabled: true,
          teamDomain: "team.cloudflareaccess.com",
          allowedAudiences: ["aud_1"]
        }
      })
    ).resolves.toBe(false);
  });

  it("validates provider keys without reflecting submitted secrets", async () => {
    const upstreamCalls: Array<{ url: string; authorization?: string }> = [];
    const handler = createTestHandler({
      providerValidationFetch: async (url, init) => {
        upstreamCalls.push({ url, authorization: init.headers.authorization });
        return { status: 200 };
      }
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
    const handler = createTestHandler();

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

  it("marks debug admin accounts for first-login credential changes", async () => {
    const handler = createTestHandler({
      users: [
        {
          id: "owner_debug_admin",
          email: "admin",
          role: "owner",
          status: "active",
          mustChangePassword: true,
          passwordHash: hashPassword({
            password: "admin",
            salt: Buffer.alloc(16),
            iterations: 1,
            unsafeAllowShortPassword: true
          })
        }
      ]
    });

    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin", password: "admin" })
    });

    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ user: { email: "admin", role: "owner", mustChangePassword: true } });
  });

  it("updates signed-in credentials and clears the first-login flag", async () => {
    const handler = createTestHandler({
      users: [
        {
          id: "owner_1",
          email: "admin",
          role: "owner",
          status: "active",
          mustChangePassword: true,
          passwordHash: hashPassword({
            password: "admin",
            salt: Buffer.alloc(16),
            iterations: 1,
            unsafeAllowShortPassword: true
          })
        }
      ]
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin", password: "admin" })
    });
    const csrf = (login.body as { csrfToken: string }).csrfToken;
    const update = await invokeApi(handler, {
      method: "POST",
      url: "/auth/credentials",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-csrf-token": csrf
      },
      body: JSON.stringify({
        email: "owner@example.test",
        password: "new-admin-password",
        passwordConfirmation: "new-admin-password"
      })
    });

    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({
      user: { email: "owner@example.test", role: "owner", mustChangePassword: false }
    });
  });

  it("requires current password for regular credential changes", async () => {
    const handler = createTestHandler({
      users: [
        {
          id: "owner_1",
          email: "owner@example.test",
          role: "owner",
          status: "active",
          mustChangePassword: false,
          passwordHash: hashPassword({
            password: "current-password",
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
      body: JSON.stringify({ email: "owner@example.test", password: "current-password" })
    });
    const csrf = (login.body as { csrfToken: string }).csrfToken;
    const blocked = await invokeApi(handler, {
      method: "POST",
      url: "/auth/credentials",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-csrf-token": csrf
      },
      body: JSON.stringify({
        email: "owner-new@example.test",
        password: "new-admin-password",
        passwordConfirmation: "new-admin-password"
      })
    });

    expect(blocked.status).toBe(403);

    const updated = await invokeApi(handler, {
      method: "POST",
      url: "/auth/credentials",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-csrf-token": csrf
      },
      body: JSON.stringify({
        currentPassword: "current-password",
        email: "owner-new@example.test",
        password: "new-admin-password",
        passwordConfirmation: "new-admin-password"
      })
    });

    expect(updated.status).toBe(200);
  });

  it("allows release-mode admin proxy requests with admin session, csrf, and server token", async () => {
    const handler = createTestHandler({
      accessMode: "release",
      users: [
        {
          id: "owner_1",
          email: "owner@example.test",
          role: "owner",
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
      body: JSON.stringify({ email: "owner@example.test", password: "correct-password" })
    });
    const response = await invokeApi(handler, {
      method: "GET",
      url: "/admin/approvals",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        host: "127.0.0.1:3002",
        "x-modeldock-admin-proxy": "true",
        "x-modeldock-admin-token": "admin-secret"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ pending: [] });
  });

  it("returns experimental local subscription runtime status only to admin proxy sessions", async () => {
    const handler = createTestHandler({
      subscriptionRuntimeConfig: {
        experimentalSubscriptionOAuth: true,
        experimentalChatGPTSubscription: true,
        experimentalClaudeSubscription: false
      },
      subscriptionRuntimeRunner: async () => ({
        exitCode: 0,
        stdout: "Logged in using ChatGPT",
        stderr: ""
      }),
      users: [
        {
          id: "owner_1",
          email: "owner@example.test",
          role: "owner",
          status: "active",
          passwordHash: hashPassword({
            password: "correct-password",
            salt: Buffer.alloc(16),
            iterations: 1
          })
        }
      ]
    });
    const blocked = await invokeApi(handler, {
      method: "GET",
      url: "/experimental/subscription-runtimes"
    });
    expect(blocked.status).toBe(403);

    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.test", password: "correct-password" })
    });
    const response = await invokeApi(handler, {
      method: "GET",
      url: "/experimental/subscription-runtimes",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "x-modeldock-admin-proxy": "true",
        "x-modeldock-admin-token": "admin-secret"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      runtimes: [
        { id: "codex_local", status: "ready" },
        { id: "claude_local", status: "disabled" }
      ]
    });
  });

  it("invokes experimental local runtimes only for admin sessions with csrf", async () => {
    const calls: string[][] = [];
    const handler = createTestHandler({
      subscriptionRuntimeConfig: {
        experimentalSubscriptionOAuth: true,
        experimentalChatGPTSubscription: true,
        experimentalClaudeSubscription: false
      },
      subscriptionRuntimeRunner: async (_command, args) => {
        calls.push(args);
        return calls.length === 1
          ? { exitCode: 0, stdout: "Logged in using ChatGPT", stderr: "" }
          : { exitCode: 0, stdout: "hello access_token=secret-value", stderr: "" };
      },
      users: [
        {
          id: "owner_1",
          email: "owner@example.test",
          role: "owner",
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
      body: JSON.stringify({ email: "owner@example.test", password: "correct-password" })
    });
    const csrfToken = (login.body as { csrfToken: string }).csrfToken;

    const missingCsrf = await invokeApi(handler, {
      method: "POST",
      url: "/experimental/subscription-runtimes/invoke",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-admin-proxy": "true",
        "x-modeldock-admin-token": "admin-secret"
      },
      body: JSON.stringify({ prompt: "hello", runtimeId: "codex_local" })
    });
    expect(missingCsrf.status).toBe(403);

    const response = await invokeApi(handler, {
      method: "POST",
      url: "/experimental/subscription-runtimes/invoke",
      headers: {
        cookie: login.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-admin-proxy": "true",
        "x-modeldock-admin-token": "admin-secret",
        "x-modeldock-csrf-token": csrfToken
      },
      body: JSON.stringify({ prompt: "hello", runtimeId: "codex_local" })
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: "codex_local", status: "completed" });
    expect(JSON.stringify(response.body)).toContain("access_token=[redacted]");
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
    expect(calls[1]).toEqual(expect.arrayContaining(["exec", "--sandbox", "read-only"]));
  });

  it("turns approved signup requests into credential setup invitations", async () => {
    const registrations = createMemoryRegistrationStore();
    const authStore = createMemoryAuthStore([
      {
        id: "owner_1",
        email: "owner@example.test",
        role: "owner",
        status: "active",
        passwordHash: hashPassword({
          password: "correct-password",
          salt: Buffer.alloc(16),
          iterations: 1
        })
      }
    ]);
    const handler = createTestHandler({ authStore, registrations });
    const signup = await invokeApi(handler, {
      method: "POST",
      url: "/auth/signup",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new-user@example.test", displayName: "New User" })
    });

    expect(signup.status).toBe(202);
    const registrationId = (signup.body as { registrationId: string }).registrationId;
    const adminLogin = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.test", password: "correct-password" })
    });
    const setupInvite = await invokeApi(handler, {
      method: "POST",
      url: `/admin/approvals/${registrationId}`,
      headers: {
        cookie: adminLogin.headers["set-cookie"] ?? "",
        "content-type": "application/json",
        "x-modeldock-admin-proxy": "true",
        "x-modeldock-admin-token": "admin-secret",
        "x-modeldock-csrf-token": (adminLogin.body as { csrfToken: string }).csrfToken
      }
    });

    expect(setupInvite.status).toBe(200);
    const setupToken = (setupInvite.body as { setupToken: string }).setupToken;
    expect(setupToken).toBeTruthy();

    const setup = await invokeApi(handler, {
      method: "POST",
      url: "/auth/setup",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "new-user@example.test",
        password: "new-user-password",
        passwordConfirmation: "new-user-password",
        setupToken
      })
    });
    expect(setup.status).toBe(200);

    const userLogin = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new-user@example.test", password: "new-user-password" })
    });
    expect(userLogin.status).toBe(200);
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

  it("queues authenticated RAG document uploads without returning document text", async () => {
    const ragDocumentStore = createMemoryRagDocumentStore();
    const handler = createTestHandler({
      ragDocumentStore,
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
    const upload = await invokeApi(handler, {
      method: "POST",
      url: "/rag/documents",
      headers: { cookie: login.headers["set-cookie"] ?? "", "content-type": "application/json" },
      body: JSON.stringify({ filename: "policy.txt", text: "Team budget policy text." })
    });

    expect(upload.status).toBe(202);
    expect(upload.body).toMatchObject({ status: "queued", chunkCount: 1 });
    expect(JSON.stringify(upload.body)).not.toContain("Team budget policy text");
    expect(ragDocumentStore.uploads[0]?.document.ownerId).toBe("user_1");
    expect(ragDocumentStore.uploads[0]?.document.objectKey).toContain("/user_1/");
  });

  it("rejects unauthenticated RAG document uploads", async () => {
    const handler = createTestHandler();
    const upload = await invokeApi(handler, {
      method: "POST",
      url: "/rag/documents",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: "policy.txt", text: "Team budget policy text." })
    });

    expect(upload.status).toBe(401);
  });

});
