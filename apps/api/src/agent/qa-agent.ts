import { validateOutput } from "../validation/output-validator.js";
import { getAIProvider } from "../ai/index.js";
import { logger } from "../logger.js";
import type { AgentReport } from "./types.js";

export async function runQaAgent(sourceData: unknown, generatedText: string): Promise<AgentReport> {
  const start = Date.now();
  logger.info("QA Agent: understanding task");

  logger.info("QA Agent: running fact validation");
  const validation = await validateOutput(sourceData, generatedText);

  logger.info("QA Agent: reviewing quality");
  const provider = getAIProvider();
  const prompt = "You are a QA reviewer. Review the GENERATED TEXT below for quality issues: clarity, tone, grammar, and whether it fully addresses the likely intent. Do NOT re-check facts (that was already done separately). List up to 3 concrete quality issues, or say NONE if the text is solid.\n\nGENERATED TEXT:\n" + generatedText;

  const aiResult = await provider.chat([{ role: "user", content: prompt }]);
  const durationMs = Date.now() - start;

  const passed = validation.passed && aiResult.content.trim().toUpperCase().includes("NONE");
  logger.info({ passed: passed, factsPassed: validation.passed, durationMs: durationMs }, "QA Agent: review complete");

  const factLine = validation.passed ? "PASSED" : "FAILED - " + validation.flaggedClaims.join("; ");
  const recommendation = "FACT CHECK: " + factLine + "\n\nQUALITY REVIEW: " + aiResult.content;

  return {
    task: "qa_review",
    input: { generatedText: generatedText },
    result: { factValidation: validation },
    recommendation: recommendation,
    durationMs: durationMs,
  };
}
