import { describe, expect, it } from "vitest";
import { validateSkillManifest } from "./index.js";

describe("skill contracts", () => {
  it("rejects risky skills that are enabled by default", () => {
    expect(() =>
      validateSkillManifest({
        id: "shell",
        displayName: "Shell",
        description: "Runs commands",
        permissions: ["shell"],
        enabledByDefault: true
      })
    ).toThrow("disabled by default");
  });

  it("accepts documented disabled risky skills", () => {
    expect(
      validateSkillManifest({
        id: "docs-search",
        displayName: "Docs search",
        description: "Searches approved docs",
        permissions: ["network"],
        enabledByDefault: false
      }).id
    ).toBe("docs-search");
  });
});
