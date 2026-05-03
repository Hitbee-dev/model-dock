import { createHash } from "node:crypto";
import { createRagIngestPlan, createTenantScope, type RagIngestPlan } from "@modeldock/rag";
import { createPostgresPool, isUsableDatabaseUrl, migrateApiDatabase, type QueryClient } from "./postgres.js";

export type RagDocumentStoreRecord = {
  id: string;
  ownerId: string;
  tenantId: string;
  sourceUri: string;
  objectKey: string;
  objectByteLength: number;
  objectChecksumSha256: string;
  status: "queued";
  createdAt: string;
  chunkCount: number;
};

export type RagDocumentStore = {
  saveUpload(input: { document: RagDocumentStoreRecord; ingestPlan: RagIngestPlan; text: string }): Promise<void>;
};

export type RagDocumentUploadResult = {
  documentId: string;
  status: "queued";
  chunkCount: number;
  objectKey: string;
};

export type RagDocumentUploadConfig = {
  className?: string;
  maxChunkCharacters?: number;
  objectKeyPrefix?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function cleanFilename(value: unknown): string {
  const name = typeof value === "string" && value.trim() ? value.trim() : "document.txt";
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "document.txt";
}

function requireText(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("RAG document text is required.");
  }
  if (Buffer.byteLength(value, "utf8") > 1_000_000) {
    throw new Error("RAG document text is too large.");
  }

  return value;
}

export async function ingestRagDocumentUpload(input: {
  authenticatedUserId: string;
  body: Record<string, unknown>;
  config?: RagDocumentUploadConfig;
  store: RagDocumentStore;
  now?: Date;
  randomUUID?: () => string;
}): Promise<RagDocumentUploadResult> {
  const now = input.now ?? new Date();
  const documentId = `ragdoc_${input.randomUUID?.() ?? crypto.randomUUID()}`;
  const filename = cleanFilename(input.body.filename);
  const text = requireText(input.body.text);
  const objectKeyPrefix = input.config?.objectKeyPrefix ?? "rag-documents";
  const objectKey = `${objectKeyPrefix}/${input.authenticatedUserId}/${documentId}/${filename}`;
  const sourceUri = `s3://modeldock/${objectKey}`;
  const scope = createTenantScope({
    authenticatedUserId: input.authenticatedUserId,
    documentOwnerId: input.authenticatedUserId
  });
  const ingestPlan = createRagIngestPlan({
    scope,
    className: input.config?.className ?? "ModelDockChunk",
    maxChunkCharacters: input.config?.maxChunkCharacters ?? 2_000,
    document: {
      documentId,
      sourceUri,
      text,
      ownerId: input.authenticatedUserId,
      authenticatedUserId: input.authenticatedUserId
    }
  });
  const document: RagDocumentStoreRecord = {
    id: ingestPlan.document.id,
    ownerId: ingestPlan.document.ownerId,
    tenantId: ingestPlan.document.tenantId,
    sourceUri,
    objectKey,
    objectByteLength: Buffer.byteLength(text, "utf8"),
    objectChecksumSha256: sha256(text),
    status: "queued",
    createdAt: now.toISOString(),
    chunkCount: ingestPlan.chunks.length
  };
  await input.store.saveUpload({ document, ingestPlan, text });

  return {
    documentId: document.id,
    status: document.status,
    chunkCount: document.chunkCount,
    objectKey: document.objectKey
  };
}

export function createMemoryRagDocumentStore(): RagDocumentStore & {
  uploads: Array<{ document: RagDocumentStoreRecord; ingestPlan: RagIngestPlan; text: string }>;
} {
  const uploads: Array<{ document: RagDocumentStoreRecord; ingestPlan: RagIngestPlan; text: string }> = [];
  return {
    uploads,
    async saveUpload(input) {
      uploads.push(input);
    }
  };
}

export async function createRagDocumentStoreFromEnv(input: {
  databaseUrl: string | undefined;
  fallback: RagDocumentStore;
  nodeEnv: string | undefined;
}): Promise<RagDocumentStore> {
  if (!isUsableDatabaseUrl(input.databaseUrl)) {
    if (input.nodeEnv === "production") {
      throw new Error("DATABASE_URL must be configured in production.");
    }
    return input.fallback;
  }

  const pool = createPostgresPool(input.databaseUrl);
  await migrateApiDatabase(pool);
  return createPostgresRagDocumentStore(pool);
}

export function createPostgresRagDocumentStore(client: QueryClient): RagDocumentStore {
  return {
    async saveUpload(input) {
      await client.query(
        `insert into rag_documents (
          id, owner_id, tenant_id, source_uri, object_key, object_byte_length,
          object_checksum_sha256, status, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, 'queued', $8)`,
        [
          input.document.id,
          input.document.ownerId,
          input.document.tenantId,
          input.document.sourceUri,
          input.document.objectKey,
          input.document.objectByteLength,
          input.document.objectChecksumSha256,
          input.document.createdAt
        ]
      );

      for (const chunk of input.ingestPlan.chunks) {
        const weaviateObjectId = input.ingestPlan.objects.find((object) => object.id === chunk.id)?.id ?? chunk.id;
        await client.query(
          `insert into rag_chunks (
            id, document_id, tenant_id, ordinal, text_checksum_sha256, weaviate_object_id
          ) values ($1, $2, $3, $4, $5, $6)`,
          [chunk.id, chunk.documentId, input.document.tenantId, chunk.ordinal, sha256(chunk.text), weaviateObjectId]
        );
      }
    }
  };
}
