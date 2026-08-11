import { getAIProvider } from "../ai/index.js";
import { toolRegistry } from "../tools/index.js";
import { logger } from "../logger.js";

export interface EngineReport {
  engine: string;
  url: string;
  analysis: string;
  durationMs: number;
}

const ENGINE_PROMPTS: Record<string, string> = {
  geo: `You are a GEO (Generative Engine Optimization) analyst. Based on the page content below, evaluate: entity clarity, topical authority signals, factual clarity, citation-friendliness, answer completeness, and question coverage. Give 3-5 specific, evidence-based recommendations. Do not promise rankings or guaranteed outcomes. Base every claim only on the content shown.`,
  aeo: `You are an AEO (Answer Engine Optimization) analyst. Based on the page content below, evaluate: direct-answer optimization, FAQ opportunities, structured answer formats, and entity/context clarity. Give 3-5 specific recommendations to make this content more likely to be surfaced as a direct answer. Do not guarantee inclusion in any search or answer engine.`,
  cro: `You are a CRO (Conversion Rate Optimization) analyst. Based on the page content below, evaluate: value proposition clarity, CTA strength, trust signals, friction points, objections, page hierarchy, and social proof. Give 3-5 specific hypotheses for improving conversion (frame as hypotheses to test, not guaranteed outcomes).`,
};

export async function runAnalysisEngine(engine: "geo" | "aeo" | "cro", url: string): Promise<EngineReport> {
  const start = Date.now();
  const promptTemplate = ENGINE_PROMPTS[engine];
  if (!promptTemplate) {
    throw new Error(`Unknown engine: ${engine}`);
  }

  logger.info({ engine, url }, `${engine.toUpperCase()} Engine: collecting data`);
  const toolResult = await toolRegistry.execute("crawl_and_analyze_seo", { url });
  const data = toolResult as { metadata: { title: string | null; h1: string[]; h2: string[]; wordCount: number } };

  const prompt = `${promptTemplate}

PAGE DATA:
Title: ${data.metadata.title ?? "(none)"}
H1: ${data.metadata.h1.join(", ") || "(none)"}
H2: ${data.metadata.h2.join(", ") || "(none)"}
Word count: ${data.metadata.wordCount}

Give your analysis now.`;

  logger.info({ engine, url }, `${engine.toUpperCase()} Engine: generating analysis`);
  const provider = getAIProvider();
  const result = await provider.chat([{ role: "user", content: prompt }]);

  const durationMs = Date.now() - start;
  logger.info({ engine, url, durationMs }, `${engine.toUpperCase()} Engine: complete`);

  return {
    engine,
    url,
    analysis: result.content,
    durationMs,
  };
}
