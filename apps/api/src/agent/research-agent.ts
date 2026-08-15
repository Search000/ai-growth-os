import { getAIProvider } from "../ai/index.js";
import { retrieveRelevantChunks } from "../knowledge/rag.js";
import { logger } from "../logger.js";
import type { AgentReport } from "./types.js";

export async function runResearchAgent(topic: string): Promise<AgentReport> {
  const start = Date.now();
  logger.info({ topic }, "Research Agent: understanding task");

  logger.info({ topic }, "Research Agent: retrieving knowledge base context");
  const chunks = await retrieveRelevantChunks(topic, 5);
  const context = chunks.length > 0
    ? chunks.map((c) => `[${c.sourceType}:${c.sourceRef ?? "unknown"}] ${c.content}`).join("\n\n")
    : "No relevant internal knowledge found.";

  logger.info({ topic }, "Research Agent: generating research summary");
  const provider = getAIProvider();
  const prompt = `You are a research analyst. Using ONLY the internal knowledge context below, write a concise research summary on the topic. If the context does not contain enough information, clearly say so instead of inventing facts.

TOPIC: ${topic}

INTERNAL KNOWLEDGE CONTEXT:
${context}

Write a research summary (key facts, gaps, and suggested next research steps):`;

  const aiResult = await provider.chat([{ role: "user", content: prompt }]);
  const durationMs = Date.now() - start;
  logger.info({ topic, durationMs }, "Research Agent: report complete");

  return {
    task: "research",
    input: { topic },
    result: { chunksUsed: chunks.length, chunks },
    recommendation: aiResult.content,
    durationMs,
  };
}
