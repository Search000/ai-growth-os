import { toolRegistry } from "../tools/index.js";
import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";

export interface AgentReport {
  task: string;
  url: string;
  toolResult: unknown;
  recommendation: string;
  durationMs: number;
}

export async function runSeoAgent(url: string): Promise<AgentReport> {
  const start = Date.now();
  logger.info({ url }, "SEO Agent: understanding task");

  // Plan: this agent always does crawl+analyze then asks LLM for recommendations
  logger.info({ url }, "SEO Agent: collecting data via tool");
  const toolResult = await toolRegistry.execute("crawl_and_analyze_seo", { url });

  logger.info({ url }, "SEO Agent: generating recommendation");
  const provider = getAIProvider();

  const prompt = `You are an SEO analyst. Based on this SEO audit data (JSON below), write a short, prioritized list of the top 3 actionable recommendations to improve this page's SEO. Be concise and specific. Do not invent data not present in the JSON.

SEO AUDIT DATA:
${JSON.stringify(toolResult, null, 2)}`;

  const aiResult = await provider.chat([{ role: "user", content: prompt }]);

  const durationMs = Date.now() - start;
  logger.info({ url, durationMs }, "SEO Agent: report complete");

  return {
    task: "seo_audit",
    url,
    toolResult,
    recommendation: aiResult.content,
    durationMs,
  };
}
