import { describe, expect, it } from "vitest";
import { isSubscriptionOAuthEnabled } from "./index.js";

describe("BYOK contracts", () => {
  it("keeps subscription OAuth disabled unless explicitly enabled", () => {
    expect(isSubscriptionOAuthEnabled(false)).toBe(false);
    expect(isSubscriptionOAuthEnabled(true)).toBe(true);
  });
});
