import { createHash } from "node:crypto";
import { createRagDeletionPlan, createRagIngestPlan, createTenantScope, type RagIngestPlan } from "@modeldock/rag";
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
  findOwnedDocument(input: { documentId: string; ownerId: string }): Promise<RagDocumentDeletionTarget | undefined>;
  markDeleted(input: { documentId: string; ownerId: string; deletedAt: string }): Promise<void>;
};

export type RagDocumentDeletionTarget = Pick<
  RagDocumentStoreRecord,
  "id" | "ownerId" | "tenantId" | "objectKey"
> & {
  weaviateObjectIds: string[];
};

export type RagVectorDeletionClient = {
  deleteDocument(input: {
    className: string;
    documentId: string;
    tenantId: string;
    where: ReturnType<typeof createRagDeletionPlan>["where"];
    weaviateObjectIds: string[];
  }): Promise<void>;
};

export type RagObjectDeletionClient = {
  deleteObject(key: string): Promise<void>;
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

export async function deleteRagDocument(input: {
  authenticatedUserId: string;
  documentId: string;
  store: RagDocumentStore;
  objectStorage: RagObjectDeletionClient;
  vectorStore: RagVectorDeletionClient;
  className?: string;
  now?: Date;
}): Promise<{ documentId: string; status: "deleted" }> {
  const document = await input.store.findOwnedDocument({
    documentId: input.documentId,
    ownerId: input.authenticatedUserId
  });
  if (!document) {
    throw new Error("RAG document was not found.");
  }

  const deletionPlan = createRagDeletionPlan({
    className: input.className ?? "ModelDockChunk",
    documentId: document.id,
    tenantId: document.tenantId
  });
  await input.vectorStore.deleteDocument({
    className: deletionPlan.className,
    documentId: document.id,
    tenantId: document.tenantId,
    where: deletionPlan.where,
    weaviateObjectIds: document.weaviateObjectIds
  });
  await input.objectStorage.deleteObject(document.objectKey);
  await input.store.markDeleted({
    documentId: document.id,
    ownerId: input.authenticatedUserId,
    deletedAt: (input.now ?? new Date()).toISOString()
  });

  return { documentId: document.id, status: "deleted" };
}

export function createMemoryRagDocumentStore(): RagDocumentStore & {
  uploads: Array<{ document: RagDocumentStoreRecord; ingestPlan: RagIngestPlan; text: string }>;
  deleted: Array<{ documentId: string; ownerId: string; deletedAt: string }>;
} {
  const uploads: Array<{ document: RagDocumentStoreRecord; ingestPlan: RagIngestPlan; text: string }> = [];
  const deleted: Array<{ documentId: string; ownerId: string; deletedAt: string }> = [];
  return {
    deleted,
    uploads,
    async saveUpload(input) {
      uploads.push(input);
    },
    async findOwnedDocument(input) {
      const upload = uploads.find(
        (entry) => entry.document.id === input.documentId && entry.document.ownerId === input.ownerId
      );
      if (!upload || deleted.some((entry) => entry.documentId === input.documentId && entry.ownerId === input.ownerId)) {
        return undefined;
      }

      return {
        id: upload.document.id,
        ownerId: upload.document.ownerId,
        tenantId: upload.document.tenantId,
        objectKey: upload.document.objectKey,
        weaviateObjectIds: upload.ingestPlan.objects.map((object) => object.id)
      };
    },
    async markDeleted(input) {
      deleted.push(input);
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
    },
    async findOwnedDocument(input) {
      const result = await client.query<{
        id: string;
        owner_id: string;
        tenant_id: string;
        object_key: string;
        weaviate_object_ids: string[];
      }>(
        `select d.id, d.owner_id, d.tenant_id, d.object_key,
                coalesce(array_agg(c.weaviate_object_id order by c.ordinal)
                  filter (where c.weaviate_object_id is not null), '{}') as weaviate_object_ids
         from rag_documents d
         left join rag_chunks c on c.document_id = d.id
         where d.id = $1 and d.owner_id = $2 and d.deleted_at is null
         group by d.id, d.owner_id, d.tenant_id, d.object_key`,
        [input.documentId, input.ownerId]
      );
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            ownerId: row.owner_id,
            tenantId: row.tenant_id,
            objectKey: row.object_key,
            weaviateObjectIds: row.weaviate_object_ids
          }
        : undefined;
    },
    async markDeleted(input) {
      await client.query(
        `update rag_documents
         set deleted_at = $3, status = 'deleted'
         where id = $1 and owner_id = $2 and deleted_at is null`,
        [input.documentId, input.ownerId, input.deletedAt]
      );
    }
  };
}
