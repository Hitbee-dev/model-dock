import type { IncomingMessage } from "node:http";

export type AdminGuardOptions = {
  adminAppUrl: string;
  adminApiToken?: string;
};

export function isAdminHost(request: IncomingMessage, adminAppUrl: string): boolean {
  const expected = new URL(adminAppUrl).host;
  return request.headers["x-modeldock-trusted-host"] === expected;
}

export function isAuthorizedAdminRequest(request: IncomingMessage, options: AdminGuardOptions): boolean {
  const token = options.adminApiToken;
  if (!token || token.startsWith("replace-with-")) {
    return false;
  }

  return isAdminHost(request, options.adminAppUrl) && request.headers["x-modeldock-admin-token"] === token;
}
