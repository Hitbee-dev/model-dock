import { describe, expect, it } from "vitest";
import { createLiteLLMHeaders, renderLiteLLMConfig } from "./index.js";

describe("LiteLLM helpers", () => {
  it("keeps the master key server-side in authorization headers", () => {
    expect(createLiteLLMHeaders("secret").authorization).toBe("Bearer secret");
  });

  it("renders route config in the isolated package", () => {
    expect(
      renderLiteLLMConfig([
        {
          modelName: "gpt-4o-mini",
          provider: "openai",
          credentialRef: "OPENAI_API_KEY"
        }
      ])
    ).toContain("model_name: gpt-4o-mini");
  });
});
