import { describe, expect, it } from "vitest";
import { chunkText } from "./chunking.js";
import { createRagAugmentedMessages, createRagContextBlock } from "./chat-context.js";
import { createRagDeletionPlan, createRagIngestPlan } from "./ingest.js";
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

  it("creates a tenant-scoped Weaviate ingest plan", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });
    const plan = createRagIngestPlan({
      scope,
      className: "ModelDockChunk",
      maxChunkCharacters: 8,
      document: {
        documentId: "doc_1",
        sourceUri: "s3://modeldock/doc_1.txt",
        text: "alpha beta gamma",
        ownerId: "user_1",
        authenticatedUserId: "user_1"
      }
    });

    expect(plan.document.tenantId).toBe("user_1");
    expect(plan.objects[0]?.properties.text).toBe("alpha be");
    expect(plan.objects[0]?.properties.textChecksumSha256).toHaveLength(64);
  });

  it("rejects RAG ingest for a different owner", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });

    expect(() =>
      createRagIngestPlan({
        scope,
        className: "ModelDockChunk",
        maxChunkCharacters: 8,
        document: {
          documentId: "doc_1",
          sourceUri: "s3://modeldock/doc_1.txt",
          text: "alpha",
          ownerId: "user_2",
          authenticatedUserId: "user_1"
        }
      })
    ).toThrow("owner");
  });

  it("builds deletion plans scoped by document and tenant", () => {
    const plan = createRagDeletionPlan({
      className: "ModelDockChunk",
      documentId: "doc_1",
      tenantId: "user_1"
    });

    expect(plan.where.operands).toHaveLength(2);
    expect(plan.where.operands.map((operand) => operand.valueText)).toEqual(["doc_1", "user_1"]);
  });

  it("creates tenant-scoped chat context without source query secrets", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });
    const context = createRagContextBlock({
      scope,
      maxContextCharacters: 500,
      chunks: [
        {
          id: "doc_1:0",
          tenantId: "user_1",
          documentId: "doc_1",
          text: "Budget policy details",
          sourceUri: "s3://bucket/doc.txt?token=secret#fragment"
        }
      ]
    });

    expect(context).toContain("Budget policy details");
    expect(context).toContain("s3://bucket/doc.txt");
    expect(context).not.toContain("token=secret");
  });

  it("rejects retrieved chunks outside the server-derived tenant", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });

    expect(() =>
      createRagContextBlock({
        scope,
        maxContextCharacters: 500,
        chunks: [{ id: "doc_1:0", tenantId: "user_2", documentId: "doc_1", text: "other tenant" }]
      })
    ).toThrow("tenant scope");
  });

  it("rejects obvious secret-bearing RAG context", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });

    expect(() =>
      createRagContextBlock({
        scope,
        maxContextCharacters: 500,
        chunks: [{ id: "doc_1:0", tenantId: "user_1", documentId: "doc_1", text: "api_key=secret" }]
      })
    ).toThrow("secret-bearing");
  });

  it("augments chat messages only when retrieved context exists", () => {
    const scope = createTenantScope({ authenticatedUserId: "user_1", documentOwnerId: "user_1" });

    expect(
      createRagAugmentedMessages({
        scope,
        userMessage: "What is my budget?",
        chunks: [],
        maxContextCharacters: 500
      })
    ).toEqual([{ role: "user", content: "What is my budget?" }]);

    const messages = createRagAugmentedMessages({
      scope,
      userMessage: "What is my budget?",
      maxContextCharacters: 500,
      chunks: [{ id: "doc_1:0", tenantId: "user_1", documentId: "doc_1", text: "Budget is five dollars." }]
    });

    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("tenant-scoped reference context");
    expect(messages[1]).toEqual({ role: "user", content: "What is my budget?" });
  });
});
