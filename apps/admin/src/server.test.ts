import { describe, expect, it } from "vitest";
import { createAdminAccessGate } from "./access.js";
import {
  renderAccessSettingsPage,
  renderApprovalsPage,
  renderLoginPage,
  renderSetupAccountPage,
  renderSubscriptionRuntimesPage
} from "./pages.js";

describe("admin scaffold", () => {
  it("documents a dedicated admin service", () => {
    expect("modeldock-admin").toContain("admin");
  });

  it("renders the approval surface", () => {
    expect(renderApprovalsPage({ approvals: [] })).toContain("Pending approvals");
  });

  it("renders admin as a protected responsive surface", () => {
    const page = renderApprovalsPage({
      approvals: [
        {
          id: 'reg_1" onclick="alert(1)',
          email: "user@example.com",
          requestedAt: "2026-05-03T00:00:00.000Z"
        }
      ]
    });

    expect(page).toContain("Protected admin host");
    expect(page).toContain("@media (max-width: 780px)");
    expect(page).toContain("<svg");
    expect(page).toContain("&quot;");
  });

  it("renders default admin login copy", () => {
    const page = renderLoginPage("en");

    expect(page).toContain("admin/admin");
    expect(page).toContain('value="admin"');
    expect(page).not.toContain('autocomplete="current-password" value="admin"');
    expect(page).toContain('action="/login"');
  });

  it("preserves valid setup fields and marks only the failing field", () => {
    const page = renderSetupAccountPage({
      error: "The current password is incorrect.",
      fieldErrors: { currentPassword: "Current password is incorrect." },
      values: { email: "owner@example.test" }
    });

    expect(page).toContain('value="owner@example.test"');
    expect(page).not.toContain('value="new-admin-password"');
    expect(page).toContain("data-setup-account-form");
    expect(page).toContain("Current password is incorrect.");
  });

  it("allows admin access when either IP or device fingerprint matches", () => {
    const gate = createAdminAccessGate({
      allowedIps: "203.0.113.10",
      allowedMacs: "aa:bb:cc:dd:ee:ff",
      mode: "release",
      trustedProxyIps: "127.0.0.1"
    });

    expect(
      gate.isAllowed({
        headers: { "cf-connecting-ip": "203.0.113.10" },
        socket: { remoteAddress: "127.0.0.1" }
      } as never)
    ).toBe(true);
    expect(
      gate.isAllowed({
        headers: { "x-modeldock-device-mac": "AA-BB-CC-DD-EE-FF" },
        socket: { remoteAddress: "127.0.0.1" }
      } as never)
    ).toBe(true);
    expect(
      gate.isAllowed({
        headers: { "cf-connecting-ip": "203.0.113.10" },
        socket: { remoteAddress: "198.51.100.20" }
      } as never)
    ).toBe(false);
    expect(gate.isAllowed({ headers: {}, socket: { remoteAddress: "198.51.100.20" } } as never)).toBe(false);
  });

  it("does not trust localhost host headers for debug access", () => {
    const debugGate = createAdminAccessGate({ mode: "debug" });
    const request = { headers: { host: "127.0.0.1:3001" }, socket: { remoteAddress: "10.244.0.1" } } as never;

    expect(debugGate.isAllowed(request)).toBe(false);
  });

  it("allows explicit CIDR rules for local Kubernetes port-forward sources", () => {
    const gate = createAdminAccessGate({ allowedIps: "192.168.194.0/25", mode: "debug" });

    expect(gate.isAllowed({ headers: {}, socket: { remoteAddress: "192.168.194.1" } } as never)).toBe(true);
    expect(gate.isAllowed({ headers: {}, socket: { remoteAddress: "192.168.195.1" } } as never)).toBe(false);
  });

  it("renders editable admin access rules", () => {
    const gate = createAdminAccessGate({ allowedIps: "127.0.0.1", mode: "release" });
    const page = renderAccessSettingsPage({ snapshot: gate.snapshot() });

    expect(page).toContain("Allowed IPs");
    expect(page).toContain("127.0.0.1");
    expect(page).toContain("/settings/access-rules/delete");
  });

  it("renders experimental local subscription runtime status", () => {
    const page = renderSubscriptionRuntimesPage({
      runtimes: [
        {
          command: "codex",
          displayName: "Codex CLI",
          enabled: true,
          id: "codex_local",
          loginHint: "codex login",
          message: "Local CLI is installed and authenticated.",
          status: "ready",
          termsWarning: "Experimental local Codex runtime uses the operator's local Codex CLI login."
        }
      ]
    });

    expect(page).toContain("Codex CLI");
    expect(page).toContain("ready");
    expect(page).toContain("/subscription-runtimes/invoke");
    expect(page).toContain("Run test");
    expect(page).not.toContain("access_token");
  });
});
