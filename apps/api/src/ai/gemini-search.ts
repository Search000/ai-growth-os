import { config } from "../config.js";
import { logger } from "../logger.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Web-grounded research summary via Gemini. Returns null if not configured or on failure. */
export async function geminiWebSearch(query: string): Promise<string | null> {
  if (!config.GEMINI_API_KEY) {
    return null;
  }

  const prompt = `Research the following topic using current web information and write a concise, factual summary covering key facts, recent developments, and relevant context. Topic: "${query}"`;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${config.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.warn({ status: res.status, errText }, "Gemini web research failed");
      return null;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim() || null;
  } catch (err) {
    logger.warn({ err }, "Gemini web research network error");
    return null;
  }
}