import { describe, expect, it } from "vitest";
import { localOnlyChatWarning, renderChatPage, renderHomePage, renderProviderSettingsPage, renderSignupPage } from "./pages.js";

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

  it("links to chat from the user home", () => {
    expect(renderHomePage()).toContain("/chat");
  });

  it("warns users before enabling local-only chat storage", () => {
    const page = renderHomePage();

    expect(page).toContain(localOnlyChatWarning);
    expect(page).toContain("Use local-only storage");
  });

  it("renders provider validation without echoing API key values", () => {
    const page = renderProviderSettingsPage('http://127.0.0.1:3002" onclick="alert(1)');

    expect(page).toContain("/providers/validate");
    expect(page).toContain('type="password"');
    expect(page).toContain("&quot;");
    expect(page).not.toContain("sk-test");
  });

  it("renders a calm reasoning summary surface without raw reasoning fields", () => {
    const page = renderChatPage("http://127.0.0.1:3002");

    expect(page).toContain("Reasoning summary");
    expect(page).toContain("Working...");
    expect(page).toContain("/chat/stream");
    expect(page).not.toContain("reasoning_content");
    expect(page).not.toContain("internal monologue");
  });
});
