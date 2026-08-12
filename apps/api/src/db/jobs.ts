import { db } from "./client.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input_json TEXT NOT NULL,
    result_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    finished_at TEXT
  );
`);

export interface JobRow {
  id: number;
  type: string;
  status: "pending" | "running" | "done" | "failed";
  input_json: string;
  result_json: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export function createJob(type: string, input: unknown): number {
  const stmt = db.prepare(`INSERT INTO jobs (type, status, input_json) VALUES (?, 'pending', ?)`);
  const result = stmt.run(type, JSON.stringify(input));
  return Number(result.lastInsertRowid);
}

export function startJob(id: number): void {
  db.prepare(`UPDATE jobs SET status = 'running', started_at = datetime('now') WHERE id = ?`).run(id);
}

export function completeJob(id: number, resultData: unknown): void {
  db.prepare(`UPDATE jobs SET status = 'done', result_json = ?, finished_at = datetime('now') WHERE id = ?`).run(
    JSON.stringify(resultData),
    id
  );
}

export function failJob(id: number, errorMessage: string): void {
  db.prepare(`UPDATE jobs SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?`).run(
    errorMessage,
    id
  );
}

export function getJob(id: number): JobRow | undefined {
  return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
}

export function listJobs(limit = 20): JobRow[] {
  return db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`).all(limit) as JobRow[];
}
