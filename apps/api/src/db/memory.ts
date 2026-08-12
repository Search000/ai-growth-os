import { db } from "./client.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface MemoryEntry {
  id: number;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

export function addMemory(sessionId: string, role: "user" | "assistant", content: string): void {
  const stmt = db.prepare(`INSERT INTO agent_memory (session_id, role, content) VALUES (?, ?, ?)`);
  stmt.run(sessionId, role, content);
}

export function getRecentMemory(sessionId: string, limit = 10): MemoryEntry[] {
  const stmt = db.prepare(`
    SELECT * FROM agent_memory WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
  `);
  const rows = stmt.all(sessionId, limit) as MemoryEntry[];
  return rows.reverse();
}

export function clearMemory(sessionId: string): void {
  const stmt = db.prepare(`DELETE FROM agent_memory WHERE session_id = ?`);
  stmt.run(sessionId);
}
