export type TextChunk = {
  id: string;
  documentId: string;
  text: string;
  ordinal: number;
};

export type ChunkTextOptions = {
  maxCharacters: number;
};

export function chunkText(documentId: string, text: string, options: ChunkTextOptions): TextChunk[] {
  if (!Number.isSafeInteger(options.maxCharacters) || options.maxCharacters <= 0) {
    throw new Error("maxCharacters must be a positive safe integer.");
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: TextChunk[] = [];
  for (let index = 0; index < normalized.length; index += options.maxCharacters) {
    const ordinal = chunks.length;
    chunks.push({
      id: `${documentId}:${ordinal}`,
      documentId,
      text: normalized.slice(index, index + options.maxCharacters),
      ordinal
    });
  }

  return chunks;
}
