import { describe, expect, it } from "vitest";
import { hashPassword } from "@modeldock/auth";
import { createMemoryRegistrationStore } from "./registrations.js";
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
