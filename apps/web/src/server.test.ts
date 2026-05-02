import { describe, expect, it } from "vitest";
import { renderSignupPage } from "./pages.js";

describe("web scaffold", () => {
  it("keeps the user app separate from the admin app", () => {
    expect("@modeldock/web").not.toBe("@modeldock/admin");
  });

  it("renders a signup request page", () => {
    expect(renderSignupPage("http://127.0.0.1:3002")).toContain("/auth/signup");
  });
});
