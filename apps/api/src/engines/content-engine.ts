import { getAIProvider } from "../ai/index.js";
import { validateOutput, type ValidationResult } from "../validation/output-validator.js";
import { logger } from "../logger.js";

export type ContentType = "brief" | "outline" | "article" | "landing-copy" | "product-description" | "faq" | "social-post" | "meta-description" | "title" | "cta";

export interface ContentResult {
  contentType: ContentType;
  topic: string;
  content: string;
  durationMs: number;
  validation?: ValidationResult;
}

const CONTENT_PROMPTS: Record<ContentType, string> = {
  brief: "Write a concise content brief for an article on the topic below. Include: target audience, key points to cover, suggested word count, and tone.",
  outline: "Write a detailed outline (headings and subheadings) for an article on the topic below.",
  article: "Write a well-structured article on the topic below. Use clear headings, be factual, and avoid making up statistics or claims not grounded in general knowledge.",
  "landing-copy": "Write landing page copy for the topic/product below. Include a headline, subheadline, 3 key benefits, and a closing CTA line.",
  "product-description": "Write a compelling product description for the item below. Focus on benefits, not just features.",
  faq: "Write 5 frequently asked questions with concise answers about the topic below.",
  "social-post": "Write 3 short social media post variations about the topic below, each under 280 characters.",
  "meta-description": "Write a meta description (max 160 characters) for a page about the topic below.",
  title: "Write 5 SEO-friendly title tag options (30-60 characters each) for a page about the topic below.",
  cta: "Write 5 call-to-action button/line variations for the topic below.",
};

export async function generateContent(contentType: ContentType, topic: string, context?: string): Promise<ContentResult> {
  const start = Date.now();
  const promptTemplate = CONTENT_PROMPTS[contentType];
  if (!promptTemplate) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  const prompt = `${promptTemplate}
TOPIC: ${topic}
${context ? `\nADDITIONAL CONTEXT:\n${context}` : ""}

Do not invent facts, statistics, or claims you cannot support. If specific data is needed, note that it should be verified rather than making it up.`;

  logger.info({ contentType, topic }, "Content Engine: generating");
  const provider = getAIProvider();
  const result = await provider.chat([{ role: "user", content: prompt }], { maxTokens: 1024 });

  let validation: ValidationResult | undefined;
  if (context && context.trim().length > 0) {
    logger.info({ contentType, topic }, "Content Engine: validating output against provided context");
    validation = await validateOutput({ context }, result.content);
    if (!validation.passed) {
      logger.warn({ contentType, topic, flaggedClaims: validation.flaggedClaims }, "Content Engine: validation flagged unsupported claims");
    }
  }

  const durationMs = Date.now() - start;
  logger.info({ contentType, topic, durationMs }, "Content Engine: complete");

  return {
    contentType,
    topic,
    content: result.content,
    durationMs,
    validation,
  };
}
