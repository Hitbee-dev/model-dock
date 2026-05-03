import { describe, expect, it } from "vitest";
import { hashPassword } from "@modeldock/auth";
import { createMemoryRagDocumentStore } from "./rag-documents.js";
import { invokeApi, createTestHandler } from "./test-helpers.js";

function activeUser(id: string, email: string) {
  return {
    id,
    email,
    role: "user" as const,
    status: "active" as const,
    passwordHash: hashPassword({
      password: "correct-password",
      salt: Buffer.alloc(16),
      iterations: 1
    })
  };
}

describe("rag document deletion", () => {
  it("propagates owner-scoped deletes to vectors, object storage, and metadata", async () => {
    const ragDocumentStore = createMemoryRagDocumentStore();
    const objectDeletes: string[] = [];
    const vectorDeletes: unknown[] = [];
    const handler = createTestHandler({
      ragDocumentStore,
      ragObjectStorage: {
        async deleteObject(key) {
          objectDeletes.push(key);
        }
      },
      ragVectorStore: {
        async deleteDocument(input) {
          vectorDeletes.push(input);
        }
      },
      users: [activeUser("user_1", "user@example.com")]
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "correct-password" })
    });
    const csrfToken = (login.body as { csrfToken: string }).csrfToken;
    const upload = await invokeApi(handler, {
      method: "POST",
      url: "/rag/documents",
      headers: { cookie: login.headers["set-cookie"] ?? "", "content-type": "application/json" },
      body: JSON.stringify({ filename: "policy.txt", text: "Team budget policy text." })
    });
    const documentId = (upload.body as { documentId: string }).documentId;
    const deletion = await invokeApi(handler, {
      method: "DELETE",
      url: `/rag/documents/${encodeURIComponent(documentId)}`,
      headers: { cookie: login.headers["set-cookie"] ?? "", "x-modeldock-csrf-token": csrfToken }
    });

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ documentId, status: "deleted" });
    expect(objectDeletes[0]).toContain(`/user_1/${documentId}/`);
    expect(vectorDeletes[0]).toMatchObject({
      documentId,
      tenantId: "user_1",
      weaviateObjectIds: [`${documentId}:0`]
    });
    expect(ragDocumentStore.deleted[0]).toMatchObject({ documentId, ownerId: "user_1" });
    expect(JSON.stringify(deletion.body)).not.toContain("Team budget policy text");
  });

  it("requires CSRF before deleting RAG documents", async () => {
    const handler = createTestHandler({
      ragObjectStorage: { async deleteObject() {} },
      ragVectorStore: { async deleteDocument() {} },
      users: [activeUser("user_1", "user@example.com")]
    });
    const login = await invokeApi(handler, {
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "correct-password" })
    });
    const deletion = await invokeApi(handler, {
      method: "DELETE",
      url: "/rag/documents/ragdoc_missing",
      headers: { cookie: login.headers["set-cookie"] ?? "" }
    });

    expect(deletion.status).toBe(403);
    expect(deletion.body).toEqual({ error: "csrf_required" });
  });
});
