import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolveLocaleFromHeaders } from "@modeldock/ui";
import { createAdminAccessGate } from "./access.js";
import {
  renderAccessSettingsPage,
  renderApprovalsPage,
  renderForbiddenPage,
  renderInvitationPage,
  renderLoginPage,
  renderSetupAccountPage,
  type PendingApproval
} from "./pages.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const apiUrl = process.env.PUBLIC_API_URL ?? "http://127.0.0.1:3002";
const publicAppUrl = process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
const accessMode = process.env.MODELDOCK_ACCESS_MODE === "release" ? "release" : "debug";
const adminApiToken = process.env.ADMIN_API_TOKEN;
const accessGate = createAdminAccessGate({
  allowedIps: process.env.ADMIN_ALLOWED_IPS,
  allowedMacs: process.env.ADMIN_ALLOWED_MACS,
  autoAllowHostNetwork: process.env.ADMIN_AUTO_ALLOW_HOST_NETWORK === "true",
  mode: accessMode,
  trustedProxyIps: process.env.TRUSTED_PROXY_IPS
});

function csrfCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `modeldock_csrf=${token}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function redirect(response: ServerResponse, location: string, headers: Record<string, string | string[]> = {}) {
  response.writeHead(303, { location, ...headers });
  response.end();
}

function cookieValue(request: IncomingMessage, name: string): string | undefined {
  const cookie = request.headers.cookie ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

async function apiFetch(path: string, request: IncomingMessage, init: RequestInit = {}) {
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      cookie: request.headers.cookie ?? "",
      "content-type": "application/json",
      "x-modeldock-admin-proxy": "true",
      ...(adminApiToken ? { "x-modeldock-admin-token": adminApiToken } : {}),
      ...(init.headers ?? {})
    }
  });
}

async function requireAdminSession(request: IncomingMessage): Promise<boolean> {
  const apiResponse = await apiFetch("/auth/session", request);
  if (!apiResponse.ok) {
    return false;
  }
  const body = (await apiResponse.json()) as { user?: { role?: string } };
  return body.user?.role === "owner" || body.user?.role === "admin";
}

function renderLoginRequired(request: IncomingMessage, response: ServerResponse) {
  const locale = resolveLocaleFromHeaders(request.headers);
  response.writeHead(401, { "content-type": "text/html; charset=utf-8" });
  response.end(renderApprovalsPage({ approvals: [], locale, needsLogin: true }));
}

function hasValidFormCsrf(request: IncomingMessage, form: URLSearchParams): boolean {
  const cookieToken = cookieValue(request, "modeldock_csrf");
  return Boolean(cookieToken && form.get("csrfToken") === cookieToken);
}

async function renderHome(request: IncomingMessage, response: ServerResponse) {
  const locale = resolveLocaleFromHeaders(request.headers);
  const approvalsResponse = await apiFetch("/admin/approvals", request);
  const approvals = approvalsResponse.ok
    ? ((await approvalsResponse.json()) as { pending: PendingApproval[] }).pending
    : [];
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(
    renderApprovalsPage({
      approvals,
      csrfToken: cookieValue(request, "modeldock_csrf"),
      locale,
      needsLogin: approvalsResponse.status === 403
    })
  );
}

const server = createServer(async (request, response) => {
  const locale = resolveLocaleFromHeaders(request.headers);
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "modeldock-admin", status: "ok" }));
    return;
  }

  if (!accessGate.isAllowed(request)) {
    response.writeHead(403, { "content-type": "text/html; charset=utf-8" });
    response.end(renderForbiddenPage(locale));
    return;
  }

  if (request.method === "GET" && request.url === "/login") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderLoginPage(locale));
    return;
  }

  if (request.method === "POST" && request.url === "/login") {
    const form = await readForm(request);
    const apiResponse = await apiFetch("/auth/login", request, {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
    });
    if (!apiResponse.ok) {
      response.writeHead(401, { "content-type": "text/html; charset=utf-8" });
      response.end(renderLoginPage(locale, "Invalid admin credentials."));
      return;
    }
    const body = (await apiResponse.json()) as { csrfToken: string; user: { mustChangePassword?: boolean } };
    const setCookie = apiResponse.headers.get("set-cookie") ?? "";
    redirect(response, body.user.mustChangePassword ? "/setup-account" : "/", {
      "set-cookie": [setCookie, csrfCookie(body.csrfToken)].filter(Boolean)
    });
    return;
  }

  if (request.method === "GET" && request.url === "/setup-account") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderSetupAccountPage({ csrfToken: cookieValue(request, "modeldock_csrf"), locale }));
    return;
  }

  if (request.method === "POST" && request.url === "/setup-account") {
    const form = await readForm(request);
    if (!hasValidFormCsrf(request, form)) {
      response.writeHead(403, { "content-type": "text/html; charset=utf-8" });
      response.end(renderForbiddenPage(locale));
      return;
    }
    const apiResponse = await apiFetch("/auth/credentials", request, {
      method: "POST",
      headers: { "x-modeldock-csrf-token": cookieValue(request, "modeldock_csrf") ?? "" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        email: form.get("email"),
        password: form.get("password"),
        passwordConfirmation: form.get("passwordConfirmation")
      })
    });
    if (!apiResponse.ok) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(
        renderSetupAccountPage({
          csrfToken: cookieValue(request, "modeldock_csrf"),
          error: "Credential update failed. Use a valid ID and a 12+ character password.",
          locale
        })
      );
      return;
    }
    redirect(response, "/");
    return;
  }

  if (request.method === "GET" && request.url === "/settings") {
    if (!(await requireAdminSession(request))) {
      renderLoginRequired(request, response);
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      renderAccessSettingsPage({
        csrfToken: cookieValue(request, "modeldock_csrf"),
        snapshot: accessGate.snapshot(),
        locale
      })
    );
    return;
  }

  if (request.method === "POST" && request.url === "/settings/access-rules") {
    const form = await readForm(request);
    if (!(await requireAdminSession(request))) {
      renderLoginRequired(request, response);
      return;
    }
    if (!hasValidFormCsrf(request, form)) {
      response.writeHead(403, { "content-type": "text/html; charset=utf-8" });
      response.end(renderForbiddenPage(locale));
      return;
    }
    accessGate.addRule({ kind: form.get("kind") === "mac" ? "mac" : "ip", value: String(form.get("value") ?? "") });
    redirect(response, "/settings");
    return;
  }

  if (request.method === "POST" && request.url === "/settings/access-rules/delete") {
    const form = await readForm(request);
    if (!(await requireAdminSession(request))) {
      renderLoginRequired(request, response);
      return;
    }
    if (!hasValidFormCsrf(request, form)) {
      response.writeHead(403, { "content-type": "text/html; charset=utf-8" });
      response.end(renderForbiddenPage(locale));
      return;
    }
    accessGate.deleteRule({ kind: form.get("kind") === "mac" ? "mac" : "ip", value: String(form.get("value") ?? "") });
    redirect(response, "/settings");
    return;
  }

  if (request.method === "POST" && request.url?.startsWith("/approvals/")) {
    const form = await readForm(request);
    if (!hasValidFormCsrf(request, form)) {
      response.writeHead(403, { "content-type": "text/html; charset=utf-8" });
      response.end(renderForbiddenPage(locale));
      return;
    }
    const id = request.url.split("/")[2];
    const apiResponse = await apiFetch(`/admin/approvals/${encodeURIComponent(id ?? "")}`, request, {
      method: "POST",
      headers: { "x-modeldock-csrf-token": cookieValue(request, "modeldock_csrf") ?? "" }
    });
    if (!apiResponse.ok) {
      redirect(response, "/");
      return;
    }
    const body = (await apiResponse.json()) as {
      setupToken: string;
      setupTokenExpiresAt: string;
      user: { email: string };
    };
    const setupUrl = new URL("/setup", publicAppUrl);
    setupUrl.searchParams.set("email", body.user.email);
    setupUrl.searchParams.set("token", body.setupToken);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      renderInvitationPage({
        email: body.user.email,
        expiresAt: body.setupTokenExpiresAt,
        locale,
        setupUrl: setupUrl.toString()
      })
    );
    return;
  }

  await renderHome(request, response);
});

server.listen(port, host, () => {
  console.log(`modeldock-admin listening on http://${host}:${port}`);
});
