import { describe, expect, it } from "vitest";
import { createAdminAccessGate } from "./access.js";
import { renderAccessSettingsPage, renderApprovalsPage, renderLoginPage } from "./pages.js";

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

  it("renders editable admin access rules", () => {
    const gate = createAdminAccessGate({ allowedIps: "127.0.0.1", mode: "release" });
    const page = renderAccessSettingsPage({ snapshot: gate.snapshot() });

    expect(page).toContain("Allowed IPs");
    expect(page).toContain("127.0.0.1");
    expect(page).toContain("/settings/access-rules/delete");
  });
});
