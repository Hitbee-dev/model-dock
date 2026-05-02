import { describe, expect, it } from "vitest";

describe("web scaffold", () => {
  it("keeps the user app separate from the admin app", () => {
    expect("@modeldock/web").not.toBe("@modeldock/admin");
  });
});
