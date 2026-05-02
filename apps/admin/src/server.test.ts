import { describe, expect, it } from "vitest";
import { renderApprovalsPage } from "./pages.js";

describe("admin scaffold", () => {
  it("documents a dedicated admin service", () => {
    expect("modeldock-admin").toContain("admin");
  });

  it("renders the approval surface", () => {
    expect(renderApprovalsPage("http://127.0.0.1:3002")).toContain("/admin/approvals");
  });
});
