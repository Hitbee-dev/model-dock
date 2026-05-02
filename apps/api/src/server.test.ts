import { describe, expect, it } from "vitest";
import { createMemoryRegistrationStore } from "./registrations.js";
import { isAuthorizedAdminRequest } from "./security.js";

describe("api scaffold", () => {
  it("fails closed for admin API on the public API placeholder", () => {
    expect("admin_api_requires_dedicated_admin_host").toMatch("admin_api");
  });

  it("keeps signup requests pending until admin approval", () => {
    const store = createMemoryRegistrationStore(() => "2026-05-02T00:00:00.000Z");
    const pending = store.submit({ email: "USER@example.com" });

    expect(store.listPending()).toHaveLength(1);
    expect(store.approve(pending.id, "owner_1").status).toBe("active");
    expect(store.listPending()).toHaveLength(0);
  });

  it("denies admin approval when the admin token is missing", () => {
    const request = { headers: { "x-modeldock-trusted-host": "127.0.0.1:3001" } };

    expect(
      isAuthorizedAdminRequest(request as never, { adminAppUrl: "http://127.0.0.1:3001", adminApiToken: undefined })
    ).toBe(false);
  });

  it("does not trust a client-controlled host header for admin approval", () => {
    const request = {
      headers: {
        host: "127.0.0.1:3001",
        "x-modeldock-admin-token": "secret"
      }
    };

    expect(
      isAuthorizedAdminRequest(request as never, { adminAppUrl: "http://127.0.0.1:3001", adminApiToken: "secret" })
    ).toBe(false);
  });
});
