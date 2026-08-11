import { db } from "./client.js";

export interface SeoAuditReportRow {
  id: number;
  url: string;
  score: number;
  checks_json: string;
  recommendation: string;
  duration_ms: number;
  created_at: string;
}

export function saveReport(input: {
  url: string;
  score: number;
  checks: unknown;
  recommendation: string;
  durationMs: number;
}): number {
  const stmt = db.prepare(`
    INSERT INTO seo_audit_reports (url, score, checks_json, recommendation, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.url,
    input.score,
    JSON.stringify(input.checks),
    input.recommendation,
    input.durationMs
  );
  return Number(result.lastInsertRowid);
}

export function listReports(limit = 20): SeoAuditReportRow[] {
  const stmt = db.prepare(`
    SELECT * FROM seo_audit_reports ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit) as SeoAuditReportRow[];
}

export function getReport(id: number): SeoAuditReportRow | undefined {
  const stmt = db.prepare(`SELECT * FROM seo_audit_reports WHERE id = ?`);
  return stmt.get(id) as SeoAuditReportRow | undefined;
}
