import { db } from "./client.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_ref TEXT,
    content TEXT NOT NULL,
    embedding_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface KnowledgeChunkRow {
  id: number;
  source_type: string;
  source_ref: string | null;
  content: string;
  embedding_json: string;
  created_at: string;
}

export function insertChunk(sourceType: string, sourceRef: string | null, content: string, embedding: number[]): number {
  const stmt = db.prepare(
    `INSERT INTO knowledge_chunks (source_type, source_ref, content, embedding_json) VALUES (?, ?, ?, ?)`
  );
  const result = stmt.run(sourceType, sourceRef, content, JSON.stringify(embedding));
  return Number(result.lastInsertRowid);
}

export function getAllChunks(): KnowledgeChunkRow[] {
  return db.prepare(`SELECT * FROM knowledge_chunks`).all() as KnowledgeChunkRow[];
}

export function deleteChunksBySource(sourceType: string, sourceRef: string): void {
  db.prepare(`DELETE FROM knowledge_chunks WHERE source_type = ? AND source_ref = ?`).run(sourceType, sourceRef);
}

export function countChunks(): number {
  const row = db.prepare(`SELECT COUNT(*) as count FROM knowledge_chunks`).get() as { count: number };
  return row.count;
}
