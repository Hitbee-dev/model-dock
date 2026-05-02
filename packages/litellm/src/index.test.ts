import { describe, expect, it } from "vitest";
import {
  createLiteLLMClient,
  createLiteLLMHeaders,
  createModelAllowlist,
  renderLiteLLMConfig,
  type LiteLLMFetch
} from "./index.js";

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

  it("creates users and virtual keys through server-side LiteLLM endpoints", async () => {
    const calls: Array<{ url: string; body: string; authorization?: string }> = [];
    const fetch: LiteLLMFetch = async (url, init) => {
      calls.push({ url, body: init.body, authorization: init.headers.authorization });
      return {
        ok: true,
        status: 200,
        async json() {
          return { key: "litellm-virtual-key" };
        }
      };
    };

    const client = createLiteLLMClient({ baseUrl: "http://litellm:4000/", masterKey: "server-only", fetch });
    await client.createUser({ userId: "user_1", maxBudgetUsd: 5, budgetDuration: "30d" });
    const key = await client.createVirtualKey({ userId: "user_1", keyAlias: "user_1-default" });

    expect(calls.map((call) => call.url)).toEqual(["http://litellm:4000/user/new", "http://litellm:4000/key/generate"]);
    expect(calls.every((call) => call.authorization === "Bearer server-only")).toBe(true);
    expect(calls[0]?.body).toContain("\"max_budget\":5");
    expect(key.keyAlias).toBe("user_1-default");
  });

  it("fails closed when LiteLLM does not return a virtual key", async () => {
    const fetch: LiteLLMFetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {};
      }
    });

    const client = createLiteLLMClient({ baseUrl: "http://litellm:4000", masterKey: "server-only", fetch });

    await expect(client.createVirtualKey({ userId: "user_1", keyAlias: "missing-key" })).rejects.toThrow(
      "virtual key"
    );
  });

  it("normalizes model allowlists and rejects empty lists", () => {
    expect(createModelAllowlist([" gpt-4o-mini ", "gpt-4o-mini", "claude-3-5-haiku"])).toEqual([
      "gpt-4o-mini",
      "claude-3-5-haiku"
    ]);
    expect(() => createModelAllowlist([" "])).toThrow("At least one model");
  });
});
