import { describe, expect, it } from "vitest";
import {
  createLiteLLMClient,
  createLiteLLMHeaders,
  createLiteLLMProvisioningPlan,
  createSpendLogsUrl,
  createModelAllowlist,
  listLiteLLMSpendRecords,
  normalizeLiteLLMSpendRows,
  renderLiteLLMConfig,
  syncLiteLLMSpend,
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
    ).toContain('model_name: "gpt-4o-mini"');
  });

  it("rejects LiteLLM YAML injection in route config", () => {
    expect(() =>
      renderLiteLLMConfig([
        {
          modelName: "gpt-4o-mini\napi_key: os.environ/OTHER_KEY",
          provider: "openai",
          credentialRef: "OPENAI_API_KEY"
        }
      ])
    ).toThrow("newlines");
    expect(() =>
      renderLiteLLMConfig([
        {
          modelName: "gpt-4o-mini",
          provider: "openai",
          credentialRef: "openai_api_key"
        }
      ])
    ).toThrow("Invalid LiteLLM credential");
  });

	  it("creates users and virtual keys through server-side LiteLLM endpoints", async () => {
    const calls: Array<{ url: string; body?: string; authorization?: string }> = [];
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

  it("updates LiteLLM user budgets through the isolated client", async () => {
    const calls: Array<{ url: string; body?: string; authorization?: string }> = [];
    const fetch: LiteLLMFetch = async (url, init) => {
      calls.push({ url, body: init.body, authorization: init.headers.authorization });
      return {
        ok: true,
        status: 200,
        async json() {
          return { user_id: "user_1" };
        }
      };
    };

    const client = createLiteLLMClient({ baseUrl: "http://litellm:4000", masterKey: "server-only", fetch });
    await client.updateUser({ userId: "user_1", maxBudgetUsd: 12.5, budgetDuration: "30d" });

    expect(calls).toEqual([
      {
        url: "http://litellm:4000/user/update",
        body: "{\"user_id\":\"user_1\",\"max_budget\":12.5,\"budget_duration\":\"30d\"}",
        authorization: "Bearer server-only"
      }
    ]);
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

  it("builds a user provisioning plan with budget and model allowlist", async () => {
    const plan = createLiteLLMProvisioningPlan({
      userId: "user_1",
      maxBudgetUsd: 5,
      budgetDuration: "30d",
      modelAllowlist: ["gpt-4o-mini", "gpt-4o-mini"]
    });
    const calls: string[] = [];
    const fetch: LiteLLMFetch = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { key: "litellm-key" };
        }
      };
    };

    const client = createLiteLLMClient({ baseUrl: "http://litellm:4000", masterKey: "server-only", fetch });
    const key = await client.provisionUserAccess(plan);

    expect(plan.user.modelAllowlist).toEqual(["gpt-4o-mini"]);
    expect(key.keyAlias).toBe("user_1-default");
    expect(calls).toEqual(["http://litellm:4000/user/new", "http://litellm:4000/key/generate"]);
  });

  it("builds scoped spend log URLs without key filters", () => {
    expect(createSpendLogsUrl("http://litellm:4000/", { userId: "user_1" })).toBe(
      "http://litellm:4000/spend/logs?user_id=user_1"
    );
    expect(createSpendLogsUrl("http://litellm:4000", { requestId: "chatcmpl_1" })).toBe(
      "http://litellm:4000/spend/logs?request_id=chatcmpl_1"
    );
  });

  it("normalizes spend rows without carrying prompts, responses, or hashed keys", () => {
    expect(
      normalizeLiteLLMSpendRows([
        {
          request_id: "chatcmpl_1",
          user: "user_1",
          spend: 0.0123,
          endTime: "2026-05-03T01:00:00Z",
          model: "gpt-4o-mini",
          api_key: "hashed-key",
          messages: [{ role: "user", content: "private" }],
          response: "private response"
        },
        {
          request_id: "missing-spend",
          user: "user_1",
          spend: -1,
          endTime: "2026-05-03T01:00:00Z"
        }
      ])
    ).toEqual([
      {
        externalId: "chatcmpl_1",
        userId: "user_1",
        spendUsd: 0.0123,
        model: "gpt-4o-mini",
        occurredAt: "2026-05-03T01:00:00.000Z"
      }
    ]);
  });

  it("lists spend records through the server-only LiteLLM client", async () => {
    const calls: Array<{ url: string; method: string; authorization?: string; body?: string }> = [];
    const fetch: LiteLLMFetch = async (url, init) => {
      calls.push({ url, method: init.method, authorization: init.headers.authorization, body: init.body });
      return {
        ok: true,
        status: 200,
        async json() {
          return [{ request_id: "req_1", user_id: "user_1", spend: 0.5, startTime: "2026-05-03T00:00:00Z" }];
        }
      };
    };

    const records = await listLiteLLMSpendRecords(
      { baseUrl: "http://litellm:4000", masterKey: "server-only", fetch },
      { userId: "user_1" }
    );

    expect(records).toEqual([
      {
        externalId: "req_1",
        userId: "user_1",
        spendUsd: 0.5,
        model: undefined,
        occurredAt: "2026-05-03T00:00:00.000Z"
      }
    ]);
    expect(calls).toEqual([
      {
        url: "http://litellm:4000/spend/logs?user_id=user_1",
        method: "GET",
        authorization: "Bearer server-only",
        body: undefined
      }
    ]);
  });

  it("syncs LiteLLM spend records into an idempotent ledger writer", async () => {
    const ledgerEntries: unknown[] = [];
    const existingIds = new Set(["req_existing"]);
    const fetch: LiteLLMFetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return [
          { request_id: "req_existing", user_id: "user_1", spend: 0.5, startTime: "2026-05-03T00:00:00Z" },
          { request_id: "req_new", user_id: "user_1", spend: 1.25, endTime: "2026-05-03T00:01:00Z" }
        ];
      }
    });

    const result = await syncLiteLLMSpend({
      clientOptions: { baseUrl: "http://litellm:4000", masterKey: "server-only", fetch },
      ledger: {
        async hasSpendExternalId(externalId) {
          return existingIds.has(externalId);
        },
        async recordSpend(entry) {
          existingIds.add(entry.externalId);
          ledgerEntries.push(entry);
        }
      }
    });

    expect(result).toEqual({
      fetched: 2,
      recorded: 1,
      skipped: 1,
      nextCursor: { requestId: "req_new" }
    });
    expect(ledgerEntries).toEqual([
      {
        userId: "user_1",
        amountUsd: -1.25,
        source: "litellm_spend",
        externalId: "req_new",
        createdAt: "2026-05-03T00:01:00.000Z"
      }
    ]);
  });
});
