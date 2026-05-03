import type { IncomingMessage, ServerResponse } from "node:http";
import { isAdminHost, isAuthorizedAdminRequest } from "./security.js";
import type { RateLimiter } from "./rate-limit.js";
import type { RegistrationStore } from "./registrations.js";

export type ApiHandlerOptions = {
  adminAppUrl: string;
  adminApiToken?: string;
  rateLimiter: RateLimiter;
  registrations: RegistrationStore;
};

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > 16_384) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readInput(request: IncomingMessage): Promise<Record<string, string>> {
  const raw = await readBody(request);
  if (request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  return JSON.parse(raw || "{}") as Record<string, string>;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function clientKey(request: IncomingMessage, action: string): string {
  return `${action}:${request.socket.remoteAddress ?? "unknown"}`;
}

export function createApiHandler(options: ApiHandlerOptions) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      if (request.url === "/healthz") {
        sendJson(response, 200, { service: "modeldock-api", status: "ok" });
        return;
      }

      if (request.method === "POST" && request.url === "/auth/signup") {
        const decision = options.rateLimiter.allow(clientKey(request, "signup"), {
          limit: 5,
          windowSeconds: 300
        });
        if (!decision.allowed) {
          sendJson(response, 429, { error: "rate_limited", resetAt: decision.resetAt });
          return;
        }

        const body = await readInput(request);
        const registration = await options.registrations.submit({ email: body.email ?? "", displayName: body.displayName });
        sendJson(response, 202, { registrationId: registration.id, status: registration.status });
        return;
      }

      if (request.url?.startsWith("/admin") && !isAdminHost(request, options.adminAppUrl)) {
        sendJson(response, 404, { error: "admin_api_requires_dedicated_admin_host" });
        return;
      }

      if (request.method === "GET" && request.url === "/admin/approvals") {
        if (!isAuthorizedAdminRequest(request, options)) {
          sendJson(response, 403, { error: "admin_approval_requires_admin_host_and_token" });
          return;
        }
        sendJson(response, 200, { pending: await options.registrations.listPending() });
        return;
      }

      if (request.method === "POST" && request.url?.startsWith("/admin/approvals/")) {
        if (!isAuthorizedAdminRequest(request, options)) {
          sendJson(response, 403, { error: "admin_approval_requires_admin_host_and_token" });
          return;
        }
        const id = request.url.split("/").at(3) ?? "";
        sendJson(response, 200, { user: await options.registrations.approve(id, "admin") });
        return;
      }

      sendJson(response, 200, { service: "modeldock-api", status: "placeholder" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected API error.";
      const isValidationError = message === "A valid email address is required.";
      sendJson(response, 400, { error: isValidationError ? message : "Invalid request." });
    }
  };
}
