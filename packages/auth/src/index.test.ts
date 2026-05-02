import { describe, expect, it } from "vitest";
import { canAccessAdmin } from "./index.js";

describe("auth contracts", () => {
  it("keeps admin access limited to owner and admin roles", () => {
    expect(canAccessAdmin("owner")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("operator")).toBe(false);
    expect(canAccessAdmin("user")).toBe(false);
  });
});
