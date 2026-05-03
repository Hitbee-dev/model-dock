import { describe, expect, it } from "vitest";
import { renderApprovalsPage } from "./pages.js";

describe("admin scaffold", () => {
  it("documents a dedicated admin service", () => {
    expect("modeldock-admin").toContain("admin");
  });

  it("renders the approval surface", () => {
    expect(renderApprovalsPage("http://127.0.0.1:3002")).toContain("/admin/approvals");
  });

  it("renders admin as a protected responsive surface", () => {
    const page = renderApprovalsPage('http://127.0.0.1:3002" onclick="alert(1)');

    expect(page).toContain("Protected admin host");
    expect(page).toContain("@media (max-width: 780px)");
    expect(page).toContain("<svg");
    expect(page).toContain("&quot;");
  });
});
