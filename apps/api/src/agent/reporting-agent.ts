import { listReports } from "../db/reports.js";
import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";
import type { AgentReport } from "./types.js";

export async function runReportingAgent(limit = 10): Promise<AgentReport> {
  const start = Date.now();
  logger.info({ limit }, "Reporting Agent: understanding task");

  logger.info({ limit }, "Reporting Agent: collecting recent reports");
  const reports = listReports(limit);

  if (reports.length === 0) {
    const durationMs = Date.now() - start;
    return {
      task: "reporting_summary",
      input: { limit },
      result: { reportCount: 0 },
      recommendation: "No SEO audit reports found yet. Run some audits first.",
      durationMs,
    };
  }

  logger.info({ limit }, "Reporting Agent: generating summary");
  const provider = getAIProvider();
  const summaryData = reports.map((r) => ({
    url: r.url,
    score: r.score,
    createdAt: r.created_at,
  }));

  const prompt = `You are a reporting analyst. Below is a list of recent SEO audit reports (JSON). Write a short executive summary covering:
1. Overall trend (scores improving, declining, or stable)
2. Which URLs need the most attention
3. One key recommendation for the team

Do not invent data not present in the JSON.

RECENT REPORTS:
${JSON.stringify(summaryData, null, 2)}`;

  const aiResult = await provider.chat([{ role: "user", content: prompt }]);
  const durationMs = Date.now() - start;
  logger.info({ limit, durationMs }, "Reporting Agent: report complete");

  return {
    task: "reporting_summary",
    input: { limit },
    result: { reportCount: reports.length, reports: summaryData },
    recommendation: aiResult.content,
    durationMs,
  };
}
