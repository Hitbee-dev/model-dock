import { createHash } from "node:crypto";
import { chunkText, type TextChunk } from "./chunking.js";
import type { RagTenantScope } from "./weaviate.js";

export type RagDocumentInput = {
  documentId: string;
  sourceUri: string;
  text: string;
  ownerId: string;
  authenticatedUserId: string;
  workspaceId?: string;
};

export type WeaviateChunkObject = {
  id: string;
  className: string;
  properties: {
    tenantId: string;
    documentId: string;
    ordinal: number;
    text: string;
    textChecksumSha256: string;
    sourceUri: string;
  };
};

export type RagIngestPlan = {
  document: {
    id: string;
    ownerId: string;
    tenantId: string;
    workspaceId?: string;
    sourceUri: string;
    status: "queued";
    textChecksumSha256: string;
  };
  chunks: TextChunk[];
  objects: WeaviateChunkObject[];
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createRagIngestPlan(input: {
  document: RagDocumentInput;
  scope: RagTenantScope;
  className: string;
  maxChunkCharacters: number;
}): RagIngestPlan {
  if (input.scope.authenticatedUserId !== input.document.authenticatedUserId) {
    throw new Error("RAG ingest scope must match the authenticated user.");
  }
  if (input.document.ownerId !== input.document.authenticatedUserId) {
    throw new Error("RAG documents can only be ingested by their owner.");
  }

  const chunks = chunkText(input.document.documentId, input.document.text, {
    maxCharacters: input.maxChunkCharacters
  });

  return {
    document: {
      id: input.document.documentId,
      ownerId: input.document.ownerId,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      sourceUri: input.document.sourceUri,
      status: "queued",
      textChecksumSha256: sha256(input.document.text)
    },
    chunks,
    objects: chunks.map((chunk) => ({
      id: chunk.id,
      className: input.className,
      properties: {
        tenantId: input.scope.tenantId,
        documentId: chunk.documentId,
        ordinal: chunk.ordinal,
        text: chunk.text,
        textChecksumSha256: sha256(chunk.text),
        sourceUri: input.document.sourceUri
      }
    }))
  };
}

export function createRagDeletionPlan(input: {
  documentId: string;
  tenantId: string;
  className: string;
}): {
  className: string;
  where: {
    operator: "And";
    operands: Array<{ path: ["documentId"] | ["tenantId"]; operator: "Equal"; valueText: string }>;
  };
} {
  return {
    className: input.className,
    where: {
      operator: "And",
      operands: [
        { path: ["documentId"], operator: "Equal", valueText: input.documentId },
        { path: ["tenantId"], operator: "Equal", valueText: input.tenantId }
      ]
    }
  };
}
