import { webcrypto } from "node:crypto";

export type CloudflareAccessConfig = {
  enabled: boolean;
  teamDomain: string;
  allowedAudiences: string[];
  allowedEmails?: string[];
};

export type CloudflareAccessClaims = {
  email: string;
  aud: string[];
  iss: string;
  exp: number;
};

export type CloudflareAccessVerifier = {
  verifyJwt(jwt: string): Promise<CloudflareAccessClaims>;
};

export type CloudflareAccessCertsResponse = {
  keys: CloudflareAccessJwk[];
};

export type CloudflareAccessJwk = {
  kid: string;
  kty: "RSA";
  alg?: "RS256";
  use?: "sig";
  n: string;
  e: string;
};

export type CloudflareAccessFetch = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type CloudflareAccessDecision = {
  allowed: boolean;
  email?: string;
  reason?: string;
};

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(base64UrlDecode(value).toString("utf8")) as T;
}

function normalizeAudience(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return typeof value === "string" ? [value] : [];
}

function assertTeamDomain(teamDomain: string): void {
  if (!/^[a-z0-9][a-z0-9.-]*\.cloudflareaccess\.com$/i.test(teamDomain)) {
    throw new Error("Cloudflare Access team domain must be a cloudflareaccess.com host.");
  }
}

function isCertsResponse(value: unknown): value is CloudflareAccessCertsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { keys?: unknown }).keys) &&
    (value as { keys: unknown[] }).keys.every(
      (key) =>
        typeof key === "object" &&
        key !== null &&
        (key as { kty?: unknown }).kty === "RSA" &&
        typeof (key as { kid?: unknown }).kid === "string" &&
        typeof (key as { n?: unknown }).n === "string" &&
        typeof (key as { e?: unknown }).e === "string"
    )
  );
}

export function createCloudflareAccessVerifier(input: {
  teamDomain: string;
  fetch: CloudflareAccessFetch;
}): CloudflareAccessVerifier {
  assertTeamDomain(input.teamDomain);
  let cachedKeys: CloudflareAccessJwk[] | undefined;

  async function loadKeys(): Promise<CloudflareAccessJwk[]> {
    if (cachedKeys) {
      return cachedKeys;
    }

    const response = await input.fetch(`https://${input.teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) {
      throw new Error(`Cloudflare Access certs request failed with status ${response.status}.`);
    }

    const json = await response.json();
    if (!isCertsResponse(json)) {
      throw new Error("Cloudflare Access certs response was invalid.");
    }

    cachedKeys = json.keys;
    return cachedKeys;
  }

  return {
    async verifyJwt(jwt) {
      const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
      if (!encodedHeader || !encodedPayload || !encodedSignature) {
        throw new Error("Cloudflare Access JWT must contain header, payload, and signature.");
      }

      const header = decodeJwtPart<{ alg?: string; kid?: string }>(encodedHeader);
      if (header.alg !== "RS256" || !header.kid) {
        throw new Error("Cloudflare Access JWT must use RS256 with a key id.");
      }

      const key = (await loadKeys()).find((candidate) => candidate.kid === header.kid);
      if (!key) {
        throw new Error("Cloudflare Access signing key was not found.");
      }

      const cryptoKey = await webcrypto.subtle.importKey(
        "jwk",
        key,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const verified = await webcrypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        base64UrlDecode(encodedSignature),
        Buffer.from(`${encodedHeader}.${encodedPayload}`)
      );
      if (!verified) {
        throw new Error("Cloudflare Access JWT signature was invalid.");
      }

      const payload = decodeJwtPart<Record<string, unknown>>(encodedPayload);
      if (typeof payload.email !== "string" || typeof payload.iss !== "string" || typeof payload.exp !== "number") {
        throw new Error("Cloudflare Access JWT claims were incomplete.");
      }

      return {
        email: payload.email,
        aud: normalizeAudience(payload.aud),
        iss: payload.iss,
        exp: payload.exp
      };
    }
  };
}

export async function verifyCloudflareAccess(input: {
  headers: Record<string, string | string[] | undefined>;
  config: CloudflareAccessConfig;
  verifier: CloudflareAccessVerifier;
  nowEpochSeconds: number;
}): Promise<CloudflareAccessDecision> {
  if (!input.config.enabled) {
    return { allowed: true, reason: "disabled" };
  }

  const jwt = headerValue(input.headers["cf-access-jwt-assertion"]);
  if (!jwt) {
    return { allowed: false, reason: "missing_cf_access_jwt" };
  }

  let claims: CloudflareAccessClaims;
  try {
    claims = await input.verifier.verifyJwt(jwt);
  } catch {
    return { allowed: false, reason: "invalid_cf_access_jwt" };
  }
  const expectedIssuer = `https://${input.config.teamDomain}`;
  if (claims.iss !== expectedIssuer) {
    return { allowed: false, reason: "invalid_cf_access_issuer" };
  }
  if (claims.exp <= input.nowEpochSeconds) {
    return { allowed: false, reason: "expired_cf_access_jwt" };
  }
  if (!claims.aud.some((audience) => input.config.allowedAudiences.includes(audience))) {
    return { allowed: false, reason: "invalid_cf_access_audience" };
  }
  if (input.config.allowedEmails?.length && !input.config.allowedEmails.includes(claims.email)) {
    return { allowed: false, reason: "email_not_allowed" };
  }

  return { allowed: true, email: claims.email };
}
