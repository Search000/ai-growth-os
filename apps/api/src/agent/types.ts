export interface AgentReport {
  task: string;
  input: Record<string, unknown>;
  result: unknown;
  recommendation: string;
  durationMs: number;
}
