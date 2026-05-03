import { describe, expect, it } from "vitest";
import { generateRagEmbeddings, type EmbeddingFetch } from "./rag-embeddings.js";

describe("rag embeddings", () => {
  it("generates chunk embeddings through the server-side LiteLLM route", async () => {
    const calls: Array<{ url: string; authorization?: string; body: Record<string, unknown> }> = [];
    const embeddingFetch: EmbeddingFetch = async (url, init) => {
      calls.push({
        url,
        authorization: init.headers.authorization,
        body: JSON.parse(init.body) as Record<string, unknown>
      });
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [{ embedding: [0.1, 0.2] }] };
        }
      };
    };

    const result = await generateRagEmbeddings({
      userId: "user_1",
      config: {
        litellmBaseUrl: "http://litellm.test/",
        litellmMasterKey: "test-master-key",
        embeddingFetch
      },
      chunks: [{ id: "doc_1:0", documentId: "doc_1", ordinal: 0, text: "private policy text" }]
    });

    expect(result).toEqual([{ chunkId: "doc_1:0", embedding: [0.1, 0.2] }]);
    expect(JSON.stringify(result)).not.toContain("private policy text");
    expect(calls).toEqual([
      {
        url: "http://litellm.test/embeddings",
        authorization: "Bearer test-master-key",
        body: {
          input: ["private policy text"],
          model: "text-embedding-3-small",
          user: "user_1"
        }
      }
    ]);
  });

  it("fails closed when LiteLLM embedding config is missing or placeholder", async () => {
    await expect(
      generateRagEmbeddings({
        userId: "user_1",
        config: {
          litellmBaseUrl: "http://litellm.test",
          litellmMasterKey: "replace-with-key",
          embeddingFetch: async () => ({ ok: true, status: 200, async json() { return {}; } })
        },
        chunks: [{ id: "doc_1:0", documentId: "doc_1", ordinal: 0, text: "text" }]
      })
    ).rejects.toThrow("not configured");
  });

  it("rejects malformed embedding responses", async () => {
    await expect(
      generateRagEmbeddings({
        userId: "user_1",
        config: {
          litellmBaseUrl: "http://litellm.test",
          litellmMasterKey: "test-master-key",
          embeddingFetch: async () => ({ ok: true, status: 200, async json() { return { data: [{ embedding: [] }] }; } })
        },
        chunks: [{ id: "doc_1:0", documentId: "doc_1", ordinal: 0, text: "text" }]
      })
    ).rejects.toThrow("malformed embedding");
  });
});
