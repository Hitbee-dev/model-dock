import type { TextChunk } from "@modeldock/rag";

export type EmbeddingFetch = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type RagEmbeddingConfig = {
  litellmBaseUrl?: string;
  litellmMasterKey?: string;
  embeddingModel?: string;
  embeddingFetch: EmbeddingFetch;
};

export type RagChunkEmbedding = {
  chunkId: string;
  embedding: number[];
};

type LiteLLMEmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>;
};

function requireEmbeddingConfig(config: RagEmbeddingConfig): { baseUrl: string; masterKey: string; model: string } {
  if (!config.litellmBaseUrl || !config.litellmMasterKey || config.litellmMasterKey.startsWith("replace-with-")) {
    throw new Error("LiteLLM embeddings are not configured.");
  }

  return {
    baseUrl: config.litellmBaseUrl.replace(/\/+$/, ""),
    masterKey: config.litellmMasterKey,
    model: config.embeddingModel ?? "text-embedding-3-small"
  };
}

function parseEmbedding(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "number")) {
    throw new Error("LiteLLM returned a malformed embedding.");
  }

  return value;
}

export async function generateRagEmbeddings(input: {
  chunks: TextChunk[];
  config: RagEmbeddingConfig;
  userId: string;
}): Promise<RagChunkEmbedding[]> {
  if (input.chunks.length === 0) {
    return [];
  }

  const config = requireEmbeddingConfig(input.config);
  const response = await input.config.embeddingFetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.masterKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      input: input.chunks.map((chunk) => chunk.text),
      model: config.model,
      user: input.userId
    })
  });
  if (!response.ok) {
    throw new Error(`LiteLLM embedding request failed with status ${response.status}.`);
  }

  const body = (await response.json()) as LiteLLMEmbeddingResponse;
  const rows = body.data ?? [];
  if (rows.length !== input.chunks.length) {
    throw new Error("LiteLLM embedding response count did not match requested chunks.");
  }

  return rows.map((row, index) => ({
    chunkId: input.chunks[index]?.id ?? "",
    embedding: parseEmbedding(row.embedding)
  }));
}
