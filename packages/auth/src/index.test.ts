import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  approveRegistration,
  assertRole,
  canAccessAdmin,
  canBootstrapOwner,
  createPendingRegistration,
  createCloudflareAccessVerifier,
  createSessionTokenPair,
  hashPassword,
  hashSessionToken,
  renderSessionCookie,
  verifyCloudflareAccess,
  verifyPassword,
  verifyTokenHash
} from "./index.js";

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function signedAccessJwt(input: { payload: Record<string, unknown>; kid?: string }) {
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  const kid = input.kid ?? "test-key";
  const header = encodeJson({ alg: "RS256", kid, typ: "JWT" });
  const payload = encodeJson(input.payload);
  const signingInput = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    Buffer.from(signingInput)
  );
  const jwk = (await webcrypto.subtle.exportKey("jwk", keyPair.publicKey)) as Record<string, unknown>;

  return {
    jwt: `${signingInput}.${Buffer.from(signature).toString("base64url")}`,
    jwk: { ...jwk, kid, alg: "RS256", use: "sig" }
  };
}

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
    expect(hashSessionToken({
      token: tokens.sessionToken,
      sessionSecret: "0123456789abcdef0123456789abcdef"
    })).toBe(tokens.sessionTokenHash);
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

  it("verifies Cloudflare Access JWTs with fetched signing keys", async () => {
    const { jwt, jwk } = await signedAccessJwt({
      payload: {
        email: "owner@example.com",
        aud: ["modeldock-admin"],
        iss: "https://team.cloudflareaccess.com",
        exp: 1_800_000_000
      }
    });
    const requestedUrls: string[] = [];
    const verifier = createCloudflareAccessVerifier({
      teamDomain: "team.cloudflareaccess.com",
      fetch: async (url) => {
        requestedUrls.push(url);
        return {
          ok: true,
          status: 200,
          async json() {
            return { keys: [jwk] };
          }
        };
      }
    });

    await expect(verifier.verifyJwt(jwt)).resolves.toMatchObject({
      email: "owner@example.com",
      aud: ["modeldock-admin"]
    });
    expect(requestedUrls).toEqual(["https://team.cloudflareaccess.com/cdn-cgi/access/certs"]);
  });

  it("rejects Cloudflare Access JWTs with invalid signatures", async () => {
    const { jwt, jwk } = await signedAccessJwt({
      payload: {
        email: "owner@example.com",
        aud: ["modeldock-admin"],
        iss: "https://team.cloudflareaccess.com",
        exp: 1_800_000_000
      }
    });
    const verifier = createCloudflareAccessVerifier({
      teamDomain: "team.cloudflareaccess.com",
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return { keys: [jwk] };
        }
      })
    });

    const parts = jwt.split(".");
    parts[2] = `${parts[2]?.startsWith("A") ? "B" : "A"}${parts[2]?.slice(1) ?? ""}`;
    const tampered = parts.join(".");
    await expect(verifier.verifyJwt(tampered)).rejects.toThrow("invalid");
  });
});
