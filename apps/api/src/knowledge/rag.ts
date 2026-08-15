import { getAIProvider } from "../ai/index.js";
import { insertChunk, getAllChunks, deleteChunksBySource } from "../db/knowledge.js";
import { logger } from "../logger.js";

function chunkText(text: string, maxChars = 800): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks;
}

export async function ingestDocument(sourceType: string, sourceRef: string, text: string): Promise<number> {
  deleteChunksBySource(sourceType, sourceRef);
  const provider = getAIProvider();
  const chunks = chunkText(text);

  let count = 0;
  for (const chunk of chunks) {
    const embedding = await provider.embed(chunk);
    insertChunk(sourceType, sourceRef, chunk, embedding);
    count++;
  }

  logger.info({ sourceType, sourceRef, chunkCount: count }, "Document ingested into knowledge base");
  return count;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievedChunk {
  content: string;
  sourceType: string;
  sourceRef: string | null;
  score: number;
}

export async function retrieveRelevantChunks(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const provider = getAIProvider();
  const queryEmbedding = await provider.embed(query);
  const allChunks = getAllChunks();

  const scored = allChunks.map((chunk) => ({
    content: chunk.content,
    sourceType: chunk.source_type,
    sourceRef: chunk.source_ref,
    score: cosineSimilarity(queryEmbedding, JSON.parse(chunk.embedding_json)),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
