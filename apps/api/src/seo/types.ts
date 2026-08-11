export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
}

export interface SeoReport {
  url: string;
  score: number;
  checks: SeoCheckResult[];
}
