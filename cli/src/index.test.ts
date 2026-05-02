import { describe, expect, it } from "vitest";

describe("cli scaffold", () => {
  it("reserves the modeldock command surface", () => {
    expect("modeldock init").toContain("modeldock");
  });
});
