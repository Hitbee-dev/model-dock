import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { SubscriptionRuntimeInvocationResult, SubscriptionRuntimeProbe } from "@modeldock/byok";
import { resolveLocaleFromHeaders } from "@modeldock/ui";
import { createAdminAccessGate } from "./access.js";
import {
  renderAccessSettingsPage,
  renderApprovalsPage,
  renderForbiddenPage,
  renderInvitationPage,
  renderLoginPage,
  renderSetupAccountPage,
  renderSubscriptionRuntimesPage,
  type PendingApproval
} from "./pages.js";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const apiUrl = process.env.SERVER_API_URL ?? process.env.PUBLIC_API_URL ?? "http://127.0.0.1:3002";
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
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > 16_384) {
      throw new Error("Form body is too large.");
    }
    chunks.push(buffer);
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

type SetupField = "currentPassword" | "email" | "password" | "passwordConfirmation";

type SetupFormState = {
  error: string;
  fieldErrors: Partial<Record<SetupField, string>>;
  clearFields: SetupField[];
  values: { email?: string };
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "unknown_error";
  } catch {
    return "unknown_error";
  }
}

function setupFormState(errorCode: string, form: URLSearchParams): SetupFormState {
  const email = String(form.get("email") ?? "");
  switch (errorCode) {
    case "email_required":
      return {
        error: "Enter the admin ID or email.",
        fieldErrors: { email: "This field is required." },
        clearFields: ["email"],
        values: {}
      };
    case "password_required":
      return {
        error: "Enter a new password.",
        fieldErrors: { password: "This field is required." },
        clearFields: ["password"],
        values: { email }
      };
    case "password_too_short":
      return {
        error: "The new password must be at least 12 characters.",
        fieldErrors: { password: "Use at least 12 characters." },
        clearFields: ["password", "passwordConfirmation"],
        values: { email }
      };
    case "password_confirmation_mismatch":
      return {
        error: "The confirmation password does not match.",
        fieldErrors: { passwordConfirmation: "Re-enter the same new password." },
        clearFields: ["passwordConfirmation"],
        values: { email }
      };
    case "current_password_required":
      return {
        error: "Enter the current password before changing an existing account.",
        fieldErrors: { currentPassword: "Current password is required." },
        clearFields: ["currentPassword"],
        values: { email }
      };
    case "current_password_invalid":
      return {
        error: "The current password is incorrect.",
        fieldErrors: { currentPassword: "Current password is incorrect." },
        clearFields: ["currentPassword"],
        values: { email }
      };
    default:
      return {
        error: "Credential update failed. Check the highlighted fields.",
        fieldErrors: {},
        clearFields: [],
        values: { email }
      };
  }
}

function wantsJson(request: IncomingMessage): boolean {
  return (request.headers.accept ?? "").includes("application/json");
}

async function requireAdminSession(request: IncomingMessage): Promise<boolean> {
  try {
    const apiResponse = await apiFetch("/auth/session", request);
    if (!apiResponse.ok) {
      return false;
    }
    const body = (await apiResponse.json()) as { user?: { role?: string } };
    return body.user?.role === "owner" || body.user?.role === "admin";
  } catch {
    return false;
  }
}

function renderLoginRequired(request: IncomingMessage, response: ServerResponse) {
  const locale = resolveLocaleFromHeaders(request.headers);
  response.writeHead(401, { "content-type": "text/html; charset=utf-8" });
  response.end(renderLoginPage(locale));
}

function hasValidFormCsrf(request: IncomingMessage, form: URLSearchParams): boolean {
  const cookieToken = cookieValue(request, "modeldock_csrf");
  return Boolean(cookieToken && form.get("csrfToken") === cookieToken);
}

async function renderHome(request: IncomingMessage, response: ServerResponse) {
  const locale = resolveLocaleFromHeaders(request.headers);
  const approvalsResponse = await apiFetch("/admin/approvals", request).catch(() => undefined);
  if (!approvalsResponse || approvalsResponse.status === 403) {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderLoginPage(locale));
    return;
  }
  const approvals =
    approvalsResponse?.ok ? ((await approvalsResponse.json()) as { pending: PendingApproval[] }).pending : [];
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(
    renderApprovalsPage({
      approvals,
      csrfToken: cookieValue(request, "modeldock_csrf"),
      locale
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
      response.end(renderLoginPage(locale, "Invalid admin credentials.", { email: String(form.get("email") ?? "") }));
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
      const state = setupFormState(await readApiError(apiResponse), form);
      if (wantsJson(request)) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: state.error,
            fieldErrors: state.fieldErrors,
            clearFields: state.clearFields
          })
        );
        return;
      }
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(
        renderSetupAccountPage({
          csrfToken: cookieValue(request, "modeldock_csrf"),
          error: state.error,
          fieldErrors: state.fieldErrors,
          locale,
          values: state.values
        })
      );
      return;
    }
    if (wantsJson(request)) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, redirect: "/" }));
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

  if (request.method === "GET" && request.url === "/subscription-runtimes") {
    if (!(await requireAdminSession(request))) {
      renderLoginRequired(request, response);
      return;
    }
    const runtimeResponse = await apiFetch("/experimental/subscription-runtimes", request).catch(() => undefined);
    const body = runtimeResponse?.ok
      ? ((await runtimeResponse.json()) as { runtimes: SubscriptionRuntimeProbe[]; warning?: string })
      : { runtimes: [], warning: "runtime_status_unavailable" };
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      renderSubscriptionRuntimesPage({
        locale,
        csrfToken: cookieValue(request, "modeldock_csrf"),
        runtimes: body.runtimes,
        warning: body.warning
      })
    );
    return;
  }

  if (request.method === "POST" && request.url === "/subscription-runtimes/invoke") {
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

    const runtimeResponse = await apiFetch("/experimental/subscription-runtimes/invoke", request, {
      method: "POST",
      headers: { "x-modeldock-csrf-token": cookieValue(request, "modeldock_csrf") ?? "" },
      body: JSON.stringify({
        prompt: String(form.get("prompt") ?? ""),
        runtimeId: form.get("runtimeId") === "claude_local" ? "claude_local" : "codex_local"
      })
    }).catch(() => undefined);
    const invocation = runtimeResponse?.ok
      ? ((await runtimeResponse.json()) as SubscriptionRuntimeInvocationResult)
      : ({
          id: form.get("runtimeId") === "claude_local" ? "claude_local" : "codex_local",
          message: "Runtime invocation unavailable.",
          status: "failed",
          stderr: "",
          stdout: ""
        } as SubscriptionRuntimeInvocationResult);
    const statusResponse = await apiFetch("/experimental/subscription-runtimes", request).catch(() => undefined);
    const body = statusResponse?.ok
      ? ((await statusResponse.json()) as { runtimes: SubscriptionRuntimeProbe[]; warning?: string })
      : { runtimes: [], warning: "runtime_status_unavailable" };
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      renderSubscriptionRuntimesPage({
        csrfToken: cookieValue(request, "modeldock_csrf"),
        invocation,
        locale,
        runtimes: body.runtimes,
        warning: body.warning
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
