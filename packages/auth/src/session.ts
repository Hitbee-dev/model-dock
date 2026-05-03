import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SessionTokenPair = {
  sessionToken: string;
  sessionTokenHash: string;
  csrfToken: string;
  csrfTokenHash: string;
  expiresAt: string;
};

export type SessionCookieOptions = {
  name?: string;
  token: string;
  expiresAt: string;
  secure: boolean;
};

function hmacToken(secret: string, token: string): string {
  if (!secret || secret.startsWith("replace-with-")) {
    throw new Error("Session secret must be configured.");
  }
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Session secret must be at least 32 bytes.");
  }
  return createHmac("sha256", secret).update(token, "utf8").digest("base64url");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(input: { sessionSecret: string; token: string }): string {
  return hmacToken(input.sessionSecret, input.token);
}

export function createSessionTokenPair(input: {
  sessionSecret: string;
  now: Date;
  ttlSeconds: number;
}): SessionTokenPair {
  if (!Number.isSafeInteger(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new Error("Session TTL must be a positive safe integer.");
  }

  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(input.now.getTime() + input.ttlSeconds * 1000).toISOString();

  return {
    sessionToken,
    sessionTokenHash: hashSessionToken({ sessionSecret: input.sessionSecret, token: sessionToken }),
    csrfToken,
    csrfTokenHash: hmacToken(input.sessionSecret, csrfToken),
    expiresAt
  };
}

export function verifyTokenHash(input: {
  token: string;
  expectedHash: string;
  secret: string;
}): boolean {
  const actual = Buffer.from(hmacToken(input.secret, input.token));
  const expected = Buffer.from(input.expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function renderSessionCookie(input: SessionCookieOptions): string {
  const name = input.name ?? "modeldock_session";
  const attributes = [
    `${name}=${input.token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Expires=${new Date(input.expiresAt).toUTCString()}`
  ];
  if (input.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}
