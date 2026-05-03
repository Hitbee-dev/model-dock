import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
  verifyCloudflareAccess,
  type CloudflareAccessConfig,
  type CloudflareAccessVerifier
} from "@modeldock/auth";

export type AdminGuardOptions = {
  accessMode?: "debug" | "release";
  adminAppUrl: string;
  adminApiToken?: string;
  cloudflareAccessConfig?: CloudflareAccessConfig;
  cloudflareAccessVerifier?: CloudflareAccessVerifier;
};

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminHost(request: IncomingMessage, adminAppUrl: string): boolean {
  const expected = new URL(adminAppUrl).host;
  return headerValue(request.headers.host) === expected;
}

export function isAuthorizedAdminRequest(request: IncomingMessage, options: AdminGuardOptions): boolean {
  const token = options.adminApiToken;
  if (!token || token.startsWith("replace-with-")) {
    return false;
  }

  const providedToken = headerValue(request.headers["x-modeldock-admin-token"]);
  const isAdminProxy = headerValue(request.headers["x-modeldock-admin-proxy"]) === "true";
  return Boolean(
    providedToken &&
      (isAdminHost(request, options.adminAppUrl) || isAdminProxy) &&
      constantTimeEquals(providedToken, token)
  );
}

export async function authorizeAdminRequest(request: IncomingMessage, options: AdminGuardOptions): Promise<boolean> {
  if (!isAuthorizedAdminRequest(request, options)) {
    return false;
  }

  const config = options.cloudflareAccessConfig;
  if (!config?.enabled) {
    return true;
  }
  if (!options.cloudflareAccessVerifier) {
    return false;
  }

  const decision = await verifyCloudflareAccess({
    headers: request.headers,
    config,
    verifier: options.cloudflareAccessVerifier,
    nowEpochSeconds: Math.floor(Date.now() / 1000)
  });

  return decision.allowed;
}
