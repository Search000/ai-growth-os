import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";

export interface ValidationResult {
  passed: boolean;
  flaggedClaims: string[];
  rawResponse: string;
}

export async function validateOutput(sourceData: unknown, generatedText: string): Promise<ValidationResult> {
  const provider = getAIProvider();

  const prompt = `You are a fact-checker. Below is SOURCE DATA and a GENERATED TEXT that should only make claims supported by that source data.

List any specific factual claims in the GENERATED TEXT that are NOT supported by the SOURCE DATA (e.g. invented statistics, made-up facts, unsupported guarantees). If there are none, respond with exactly: "NONE".

SOURCE DATA:
${JSON.stringify(sourceData, null, 2)}

GENERATED TEXT:
${generatedText}

List unsupported claims (one per line), or "NONE" if all claims are supported:`;

  const result = await provider.chat([{ role: "user", content: prompt }], { maxTokens: 512 });
  const raw = result.content.trim();

  const passed = raw.toUpperCase().includes("NONE") && raw.length < 50;
  const flaggedClaims = passed
    ? []
    : raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.toUpperCase().includes("NONE"));

  logger.info({ passed, flaggedCount: flaggedClaims.length }, "Output validation complete");

  return { passed, flaggedClaims, rawResponse: raw };
}
