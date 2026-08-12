import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";

export interface StrategyResult {
  engine: string;
  topic: string;
  analysis: string;
  durationMs: number;
}

const STRATEGY_PROMPTS: Record<string, string> = {
  sem: `You are a SEM/PPC strategist. For the topic/product below, suggest: campaign structure ideas, keyword groupings (by intent), 3 sample ad copy ideas, negative keyword ideas, and intent classification. Do not claim real ad performance numbers, and do not suggest any action that spends money without explicit human approval - frame all budget ideas as concepts only.`,
  aso: `You are an ASO (App Store Optimization) strategist. For the app/topic below, suggest: app title ideas, subtitle/short description, keyword strategy, and 2-3 screenshot copy ideas. Do not claim guaranteed store ranking improvements.`,
  vseo: `You are a VSEO (Video SEO) strategist. For the video topic below, suggest: video title ideas, description copy, relevant tags/keywords, chapter/timestamp suggestions, and thumbnail copy ideas.`,
  smo: `You are a Social Media Optimization strategist. For the topic below, suggest: platform-specific content ideas (for 2-3 relevant platforms), caption/hook ideas, relevant hashtags, and content repurposing ideas.`,
  orm: `You are an Online Reputation Management analyst. For the review/feedback text below, provide: sentiment classification, issue categorization, and a draft response (professional, empathetic tone). Note explicitly that any public response requires human review and explicit authorization before posting.`,
};

export async function runStrategyEngine(engine: string, topic: string): Promise<StrategyResult> {
  const start = Date.now();
  const promptTemplate = STRATEGY_PROMPTS[engine];
  if (!promptTemplate) {
    throw new Error(`Unknown strategy engine: ${engine}`);
  }

  const prompt = `${promptTemplate}

INPUT: ${topic}

Do not invent facts, data, or performance numbers you cannot support.`;

  logger.info({ engine, topic }, `${engine.toUpperCase()} Strategy Engine: generating`);
  const provider = getAIProvider();
  const result = await provider.chat([{ role: "user", content: prompt }], { maxTokens: 1024 });

  const durationMs = Date.now() - start;
  logger.info({ engine, topic, durationMs }, `${engine.toUpperCase()} Strategy Engine: complete`);

  return {
    engine,
    topic,
    analysis: result.content,
    durationMs,
  };
}
