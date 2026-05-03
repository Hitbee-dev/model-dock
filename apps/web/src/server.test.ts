import { describe, expect, it } from "vitest";
import { renderHomePage, renderProviderSettingsPage, renderSignupPage } from "./pages.js";

describe("web scaffold", () => {
  it("keeps the user app separate from the admin app", () => {
    expect("@modeldock/web").not.toBe("@modeldock/admin");
  });

  it("renders a signup request page", () => {
    expect(renderSignupPage("http://127.0.0.1:3002")).toContain("/auth/signup");
  });

  it("links to provider settings from the user home", () => {
    expect(renderHomePage()).toContain("/providers");
  });

  it("renders provider validation without echoing API key values", () => {
    const page = renderProviderSettingsPage('http://127.0.0.1:3002" onclick="alert(1)');

    expect(page).toContain("/providers/validate");
    expect(page).toContain('type="password"');
    expect(page).toContain("&quot;");
    expect(page).not.toContain("sk-test");
  });
});
