import { toolRegistry } from "../tools/index.js";
import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";
import type { AgentReport } from "./types.js";

export async function runCompetitorAgent(ourUrl: string, competitorUrl: string): Promise<AgentReport> {
  const start = Date.now();
  logger.info({ ourUrl, competitorUrl }, "Competitor Agent: understanding task");

  logger.info({ ourUrl, competitorUrl }, "Competitor Agent: collecting data via tool");
  const [ourResult, competitorResult] = await Promise.all([
    toolRegistry.execute("crawl_and_analyze_seo", { url: ourUrl }),
    toolRegistry.execute("crawl_and_analyze_seo", { url: competitorUrl }),
  ]);

  logger.info({ ourUrl, competitorUrl }, "Competitor Agent: generating comparison");
  const provider = getAIProvider();
  const prompt = `You are a competitive SEO analyst. Compare these two SEO audit datasets (OUR SITE vs COMPETITOR) and identify:
1. Where the competitor is stronger
2. Where we are stronger
3. Top 3 gaps we should close, ranked by priority

Do not invent data not present in the JSON.

OUR SITE (${ourUrl}):
${JSON.stringify(ourResult, null, 2)}

COMPETITOR (${competitorUrl}):
${JSON.stringify(competitorResult, null, 2)}`;

  const aiResult = await provider.chat([{ role: "user", content: prompt }]);
  const durationMs = Date.now() - start;
  logger.info({ ourUrl, competitorUrl, durationMs }, "Competitor Agent: report complete");

  return {
    task: "competitor_analysis",
    input: { ourUrl, competitorUrl },
    result: { ourResult, competitorResult },
    recommendation: aiResult.content,
    durationMs,
  };
}
