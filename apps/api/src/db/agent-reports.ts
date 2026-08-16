import { db } from "./client.js";

export interface AgentReportRow {
  id: number;
  agent_type: string;
  input_json: string;
  result_json: string;
  recommendation: string;
  duration_ms: number;
  created_at: string;
}

export function saveAgentReport(input: {
  agentType: string;
  input: unknown;
  result: unknown;
  recommendation: string;
  durationMs: number;
}): number {
  const stmt = db.prepare(`
    INSERT INTO agent_reports (agent_type, input_json, result_json, recommendation, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.agentType,
    JSON.stringify(input.input),
    JSON.stringify(input.result),
    input.recommendation,
    input.durationMs
  );
  return Number(result.lastInsertRowid);
}

export function listAgentReports(agentType: string, limit = 20): AgentReportRow[] {
  const stmt = db.prepare(`
    SELECT * FROM agent_reports WHERE agent_type = ? ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(agentType, limit) as AgentReportRow[];
}

export function getAgentReport(id: number): AgentReportRow | undefined {
  const stmt = db.prepare(`SELECT * FROM agent_reports WHERE id = ?`);
  return stmt.get(id) as AgentReportRow | undefined;
}

export function deleteAgentReport(id: number): boolean {
  const stmt = db.prepare(`DELETE FROM agent_reports WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}