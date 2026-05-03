import { describe, expect, it } from "vitest";
import {
  approveRegistration,
  assertRole,
  canAccessAdmin,
  canBootstrapOwner,
  createPendingRegistration,
  createSessionTokenPair,
  hashPassword,
  renderSessionCookie,
  verifyCloudflareAccess,
  verifyPassword,
  verifyTokenHash
} from "./index.js";

describe("auth contracts", () => {
  it("keeps admin access limited to owner and admin roles", () => {
    expect(canAccessAdmin("owner")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("operator")).toBe(false);
    expect(canAccessAdmin("user")).toBe(false);
  });

  it("allows owner bootstrap only once with the expected token hash", () => {
    expect(
      canBootstrapOwner({
        state: { ownerExists: false, bootstrapTokenHash: "token-hash" },
        providedTokenHash: "token-hash"
      })
    ).toBe(true);
    expect(
      canBootstrapOwner({
        state: { ownerExists: true, bootstrapTokenHash: "token-hash" },
        providedTokenHash: "token-hash"
      })
    ).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(assertRole("operator")).toBe("operator");
    expect(() => assertRole("superadmin")).toThrow("Unknown");
  });

  it("normalizes pending registration email before approval", () => {
    const pending = createPendingRegistration({
      id: "reg_1",
      email: " USER@Example.COM ",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(pending.email).toBe("user@example.com");
    expect(approveRegistration(pending, { approvedBy: "owner_1", now: pending.requestedAt }).status).toBe("active");
  });

  it("rejects invalid registration email", () => {
    expect(() =>
      createPendingRegistration({ id: "reg_1", email: "not-email", now: "2026-05-02T00:00:00.000Z" })
    ).toThrow("valid email");
  });

  it("hashes and verifies local-login passwords", () => {
    const stored = hashPassword({
      password: "correct horse battery staple",
      iterations: 1_000,
      salt: new Uint8Array(16).fill(1)
    });

    expect(verifyPassword({ password: "correct horse battery staple", stored })).toBe(true);
    expect(verifyPassword({ password: "wrong horse battery staple", stored })).toBe(false);
    expect(verifyPassword({ password: " correct horse battery staple ", stored })).toBe(false);
  });

  it("creates secure session and CSRF token hashes", () => {
    const tokens = createSessionTokenPair({
      sessionSecret: "0123456789abcdef0123456789abcdef",
      now: new Date("2026-05-03T00:00:00.000Z"),
      ttlSeconds: 3600
    });

    expect(tokens.sessionTokenHash).not.toBe(tokens.sessionToken);
    expect(verifyTokenHash({
      token: tokens.csrfToken,
      expectedHash: tokens.csrfTokenHash,
      secret: "0123456789abcdef0123456789abcdef"
    })).toBe(true);
    expect(renderSessionCookie({ token: tokens.sessionToken, expiresAt: tokens.expiresAt, secure: true })).toContain(
      "HttpOnly"
    );
  });

  it("fails closed for invalid Cloudflare Access claims", async () => {
    const verifier = {
      async verifyJwt() {
        return {
          email: "owner@example.com",
          aud: ["wrong-aud"],
          iss: "https://team.cloudflareaccess.com",
          exp: 1_800_000_000
        };
      }
    };

    await expect(
      verifyCloudflareAccess({
        headers: { "cf-access-jwt-assertion": "jwt" },
        config: {
          enabled: true,
          teamDomain: "team.cloudflareaccess.com",
          allowedAudiences: ["modeldock-admin"]
        },
        verifier,
        nowEpochSeconds: 1_700_000_000
      })
    ).resolves.toMatchObject({ allowed: false, reason: "invalid_cf_access_audience" });
  });

  it("fails closed when Cloudflare Access JWT verification throws", async () => {
    await expect(
      verifyCloudflareAccess({
        headers: { "cf-access-jwt-assertion": "jwt" },
        config: {
          enabled: true,
          teamDomain: "team.cloudflareaccess.com",
          allowedAudiences: ["modeldock-admin"]
        },
        verifier: {
          async verifyJwt() {
            throw new Error("bad jwt");
          }
        },
        nowEpochSeconds: 1_700_000_000
      })
    ).resolves.toMatchObject({ allowed: false, reason: "invalid_cf_access_jwt" });
  });
});
