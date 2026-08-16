import { config } from "../config.js";
import { AppError } from "../error-handler.js";
import { logger } from "../logger.js";

export interface CompetitorSuggestion {
  name: string;
  url: string;
}

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function findCompetitors(url: string): Promise<CompetitorSuggestion[]> {
  if (!config.GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY not configured on server", 500);
  }

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  const prompt = `Find 3 to 5 real, currently active, direct business competitors for the website "${domain}". For each one, give the company name and homepage URL. Respond ONLY with a JSON array, no markdown fences, no other text, in exactly this shape: [{"name": "Company Name", "url": "https://example.com"}]`;

  let res: Response;
  try {
    res = await fetch(`${GEMINI_ENDPOINT}?key=${config.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });
  } catch (err) {
    logger.warn({ err }, "Gemini competitor search network error");
    throw new AppError("Failed to reach Gemini API", 502);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    logger.warn({ status: res.status, errText }, "Gemini competitor search failed");
    throw new AppError("Gemini API request failed", 502);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  let competitors: CompetitorSuggestion[] = [];
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      competitors = parsed
        .filter((c): c is { name?: unknown; url?: unknown } => !!c && typeof c === "object" && typeof (c as { url?: unknown }).url === "string")
        .map((c) => ({ name: typeof c.name === "string" ? c.name : String(c.url), url: String(c.url) }));
    }
  } catch {
    const urlMatches = cleaned.match(/https?:\/\/[^\s"'\]]+/g) ?? [];
    competitors = urlMatches.map((u) => ({ name: u, url: u }));
  }

  logger.info({ domain, count: competitors.length }, "Competitor discovery complete");

  return competitors.slice(0, 5);
}