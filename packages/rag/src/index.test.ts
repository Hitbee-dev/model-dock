import { describe, expect, it } from "vitest";
import { chunkText } from "./chunking.js";
import { createRetrievalPlan, createTenantScope } from "./weaviate.js";

describe("rag contracts", () => {
  it("chunks text deterministically", () => {
    const chunks = chunkText("doc_1", "alpha beta gamma", { maxCharacters: 6 });

    expect(chunks.map((chunk) => chunk.id)).toEqual(["doc_1:0", "doc_1:1", "doc_1:2"]);
  });

  it("rejects invalid chunk sizes", () => {
    expect(() => chunkText("doc_1", "alpha", { maxCharacters: 0 })).toThrow("positive safe integer");
  });

  it("scopes retrieval to a tenant", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });
    const plan = createRetrievalPlan(
      { url: "http://weaviate:8080", apiKey: "key", className: "ModelDockChunk", maxRetrievalLimit: 10 },
      scope,
      { query: "budget policy", requestedLimit: 50 }
    );

    expect(plan.where.valueText).toBe("user_1");
    expect(plan.limit).toBe(10);
  });

  it("rejects tenant scope for a different document owner", () => {
    expect(() => createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_2" })).toThrow(
      "authenticated owner"
    );
  });
});
