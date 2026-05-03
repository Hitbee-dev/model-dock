import { describe, expect, it } from "vitest";
import { createLiteLLMClient, syncLiteLLMSpend, type LiteLLMFetch } from "./index.js";

type RecordedRequest = {
  method?: string;
  url?: string;
  authorization?: string;
  body: string;
};

const recordedRequests: RecordedRequest[] = [];
const mockBaseUrl = "https://litellm.local";

function litellmResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

const mockProxyFetch: LiteLLMFetch = async (url, init) => {
  const requestUrl = new URL(url);
  recordedRequests.push({
    method: init.method,
    url: `${requestUrl.pathname}${requestUrl.search}`,
    authorization: init.headers.authorization,
    body: init.body ?? ""
  });

  if (init.method === "POST" && requestUrl.pathname === "/user/new") {
    return litellmResponse(200, { user_id: "user_1" });
  }
  if (init.method === "POST" && requestUrl.pathname === "/key/generate") {
    return litellmResponse(200, { key: "litellm-virtual-key" });
  }
  if (init.method === "GET" && requestUrl.pathname === "/spend/logs") {
    return litellmResponse(200, [
      { request_id: "req_1", user_id: "user_1", spend: 0.25, startTime: "2026-05-03T00:00:00Z" }
    ]);
  }

  return litellmResponse(404, { error: "not_found" });
};

const liveFetch: LiteLLMFetch = async (url, init) => {
  const response = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body
  });

  return {
    ok: response.ok,
    status: response.status,
    async json() {
      return response.json();
    }
  };
};

describe("LiteLLM proxy integration", () => {
  it("provisions users, generates keys, and syncs spend through a mock proxy", async () => {
    recordedRequests.length = 0;
    const client = createLiteLLMClient({ baseUrl: mockBaseUrl, masterKey: "server-only", fetch: mockProxyFetch });
    await client.createUser({ userId: "user_1", maxBudgetUsd: 5, budgetDuration: "30d" });
    const key = await client.createVirtualKey({ userId: "user_1", keyAlias: "user_1-default" });
    const entries: unknown[] = [];
    const sync = await syncLiteLLMSpend({
      clientOptions: { baseUrl: mockBaseUrl, masterKey: "server-only", fetch: mockProxyFetch },
      ledger: {
        async hasSpendExternalId() {
          return false;
        },
        async recordSpend(entry) {
          entries.push(entry);
        }
      }
    });

    expect(key.key).toBe("litellm-virtual-key");
    expect(sync.recorded).toBe(1);
    expect(entries).toEqual([
      {
        userId: "user_1",
        amountUsd: -0.25,
        source: "litellm_spend",
        externalId: "req_1",
        createdAt: "2026-05-03T00:00:00.000Z"
      }
    ]);
    expect(recordedRequests.map((request) => request.url)).toEqual(["/user/new", "/key/generate", "/spend/logs"]);
    expect(recordedRequests.every((request) => request.authorization === "Bearer server-only")).toBe(true);
    expect(recordedRequests.map((request) => request.body).join("\n")).not.toContain("litellm-virtual-key");
  });
});

const liveEnabled = process.env.MODELDOCK_LITELLM_LIVE_TESTS === "true";

describe("LiteLLM live integration", () => {
  (liveEnabled ? it : it.skip)("lists spend records from an opt-in live LiteLLM proxy", async () => {
    const liveBaseUrl = process.env.LITELLM_BASE_URL;
    const liveMasterKey = process.env.LITELLM_MASTER_KEY;
    if (!liveBaseUrl || !liveMasterKey || liveMasterKey.startsWith("replace-with-")) {
      throw new Error("LITELLM_BASE_URL and LITELLM_MASTER_KEY are required for live LiteLLM tests.");
    }

    const sync = await syncLiteLLMSpend({
      clientOptions: { baseUrl: liveBaseUrl, masterKey: liveMasterKey, fetch: liveFetch },
      ledger: {
        async hasSpendExternalId() {
          return true;
        },
        async recordSpend() {
          throw new Error("Live smoke test must not write ledger entries.");
        }
      }
    });

    expect(sync.fetched).toBeGreaterThanOrEqual(0);
  });
});
