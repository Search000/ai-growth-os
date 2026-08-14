import { db } from "./client.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    job_input_json TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface ScheduleRow {
  id: number;
  name: string;
  job_type: string;
  job_input_json: string;
  cron_expression: string;
  enabled: number;
  last_run_at: string | null;
  created_at: string;
}

export function createSchedule(
  name: string,
  jobType: string,
  jobInput: unknown,
  cronExpression: string
): number {
  const stmt = db.prepare(`
    INSERT INTO schedules (name, job_type, job_input_json, cron_expression)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, jobType, JSON.stringify(jobInput), cronExpression);
  return Number(result.lastInsertRowid);
}

export function listSchedules(): ScheduleRow[] {
  return db.prepare(`SELECT * FROM schedules ORDER BY created_at DESC`).all() as ScheduleRow[];
}

export function getEnabledSchedules(): ScheduleRow[] {
  return db.prepare(`SELECT * FROM schedules WHERE enabled = 1`).all() as ScheduleRow[];
}

export function updateLastRun(id: number): void {
  db.prepare(`UPDATE schedules SET last_run_at = datetime('now') WHERE id = ?`).run(id);
}

export function setScheduleEnabled(id: number, enabled: boolean): void {
  db.prepare(`UPDATE schedules SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

export function deleteSchedule(id: number): boolean {
  const result = db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
  return result.changes > 0;
}
